import { randomUUID } from "node:crypto";
import {
  createPublicClient,
  http,
  getAddress,
  isAddress,
  encodeFunctionData,
  decodeFunctionResult,
  decodeErrorResult,
  keccak256,
  toHex,
  formatUnits,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  hashAbi,
  normalizeAbi,
  toolsFor,
  validateArguments,
  jsonValue,
  positionalOutputs,
  normalizeResults,
} from "./abi.js";
import {
  DEFAULTS,
  NETWORKS,
  chainFor,
  knownTokenAddress,
  networkName,
  parseHbar,
  hbarToTinybar,
} from "./networks.js";
import { Store, findWorkspace } from "./store.js";
import { assert, asError, WorkbenchError } from "./errors.js";
import { inputSources } from "./inputs.js";
import type {
  ContractRecord,
  ExecutionResult,
  Json,
  Network,
  ToolDefinition,
  TransactionPlan,
  SwapQuote,
} from "./types.js";

function planDigest(
  plan: Omit<TransactionPlan, "digest"> | TransactionPlan,
): Hex {
  return keccak256(
    toHex(
      JSON.stringify([
        plan.schemaVersion,
        plan.id,
        plan.toolId,
        plan.contractId,
        plan.revision,
        plan.network,
        plan.chainId,
        plan.from,
        plan.to,
        plan.signature,
        plan.args,
        plan.data,
        plan.valueWeibar,
        plan.createdAt,
        plan.expiresAt,
      ]),
    ),
  );
}
export class Runtime {
  readonly store: Store;
  private active = 0;
  private queue: (() => void)[] = [];
  private inFlight = new Map<string, Promise<unknown>>();
  constructor(root = findWorkspace()) {
    this.store = new Store(root);
  }
  async fetchJson(url: string, signal?: AbortSignal) {
    const settings = await this.store.settings();
    const response = await fetch(url, {
      signal: signal
        ? AbortSignal.any([
            signal,
            AbortSignal.timeout(settings.requestTimeoutMs),
          ])
        : AbortSignal.timeout(settings.requestTimeoutMs),
    });
    assert(
      response.ok,
      response.status === 404 ? "NOT_FOUND" : "TRANSPORT",
      response.status === 404
        ? "No matching record was found."
        : `Metadata service returned ${response.status}.`,
    );
    return response.json();
  }
  private async limited<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const { rpcConcurrency } = await this.store.settings();
    assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
    if (this.active >= rpcConcurrency)
      await new Promise<void>((resolve, reject) => {
        const ready = () => {
          signal?.removeEventListener("abort", cancel);
          resolve();
        };
        const cancel = () => {
          const index = this.queue.indexOf(ready);
          if (index !== -1) this.queue.splice(index, 1);
          reject(new WorkbenchError("CANCELLED", "Request cancelled."));
        };
        this.queue.push(ready);
        signal?.addEventListener("abort", cancel, { once: true });
      });
    else this.active++;
    try {
      assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
      return await fn();
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
  async client(network: Network, signal?: AbortSignal): Promise<PublicClient> {
    const settings = await this.store.settings();
    const url = new URL(settings.rpc[network]);
    assert(
      ["https:", "http:"].includes(url.protocol),
      "CONFIG",
      "RPC URL must use HTTP or HTTPS.",
    );
    const client = createPublicClient({
      chain: chainFor(network, settings.rpc[network]),
      transport: http(settings.rpc[network], {
        timeout: settings.requestTimeoutMs,
        retryCount: 1,
        fetchOptions: signal ? { signal } : undefined,
      }),
    });
    const chainId = await this.limited(() => client.getChainId(), signal);
    assert(
      chainId === NETWORKS[network].id,
      "NETWORK_MISMATCH",
      `Endpoint reports chain ${chainId}; ${network} requires ${NETWORKS[network].id}.`,
    );
    return client;
  }
  async contract(id: string): Promise<ContractRecord> {
    const contracts = await this.store.contracts();
    const found = contracts.find(
      (c) => c.id === id || c.address.toLowerCase() === id.toLowerCase(),
    );
    assert(
      found,
      "NOT_FOUND",
      "Contract was not found. List or import contracts first.",
    );
    return found;
  }
  private async ensureCurrentContract(snapshot: ContractRecord) {
    const current = await this.contract(snapshot.id);
    assert(
      current.revision === snapshot.revision &&
        current.abiHash === snapshot.abiHash &&
        current.network === snapshot.network &&
        current.chainId === snapshot.chainId &&
        current.address === snapshot.address &&
        current.kind === snapshot.kind,
      "STALE_REVISION",
      "The contract changed during simulation. Inspect the current schema and prepare again.",
    );
  }
  async inspectTool(
    id: string,
  ): Promise<{
    contract: ContractRecord;
    tool: ToolDefinition;
    inputSources: ReturnType<typeof inputSources>;
  }> {
    for (const contract of await this.store.contracts()) {
      const catalog = toolsFor(contract).tools;
      const tool = catalog.find((t) => t.id === id);
      if (tool)
        return { contract, tool, inputSources: inputSources(tool, catalog) };
    }
    throw new WorkbenchError(
      "NOT_FOUND",
      "Tool was not found. Discover the current catalog with tools list.",
    );
  }
  async importContract(input: {
    network: Network;
    address: string;
    name?: string;
    abi?: unknown;
    refreshId?: string;
    expectedRevision?: string;
  }) {
    const network = networkName(input.network);
    assert(
      typeof input.address === "string",
      "INPUT",
      "Supply a contract address or ID.",
      "address",
    );
    input = { ...input, address: input.address.trim() };
    const suppliedAbi =
      input.abi === undefined ? undefined : normalizeAbi(input.abi);
    let address: Address,
      hederaId: string | undefined,
      kind: ContractRecord["kind"] = "contract";
    if (/^0\.0\.\d+$/.test(input.address)) {
      const metadata = await this.fetchJson(
        `${NETWORKS[network].mirror}/contracts/${input.address}`,
      );
      assert(
        metadata.evm_address && isAddress(metadata.evm_address),
        "NOT_FOUND",
        "Mirror metadata has no EVM contract address. Supply its EVM address.",
      );
      address = getAddress(metadata.evm_address);
      hederaId = metadata.contract_id;
    } else {
      assert(
        isAddress(input.address),
        "INPUT",
        "Supply an EVM address or a Hedera contract ID.",
        "address",
      );
      address = getAddress(input.address);
      try {
        const metadata = await this.fetchJson(
          `${NETWORKS[network].mirror}/contracts/${address}`,
        );
        hederaId = metadata.contract_id;
      } catch {
        /* ABI import can work before mirror indexing. */
      }
    }
    const existing = (await this.store.contracts()).find(
      (x) =>
        x.network === network &&
        x.address.toLowerCase() === address.toLowerCase(),
    );
    const client = await this.client(network);
    const code = await this.limited(() => client.getCode({ address }));
    assert(
      code && code !== "0x",
      "NOT_FOUND",
      "No EVM code exists at this address on the selected network.",
    );
    let abi, provenance: ContractRecord["provenance"];
    if (input.abi !== undefined) {
      abi = suppliedAbi!;
      provenance = { source: "supplied" };
    } else {
      const url = `https://sourcify.dev/server/v2/contract/${NETWORKS[network].id}/${address}?fields=abi`;
      let metadata;
      try {
        metadata = await this.fetchJson(url);
      } catch {
        throw new WorkbenchError(
          "ABI_REQUIRED",
          "No verified ABI was available. Supply an ABI JSON or a contract artifact.",
          "abi",
          false,
          "Import again with --abi or paste the ABI in the browser.",
        );
      }
      assert(
        metadata.abi,
        "ABI_REQUIRED",
        "Verification did not return an ABI. Supply one explicitly.",
        "abi",
      );
      abi = normalizeAbi(metadata.abi);
      provenance = { source: "sourcify", url };
    }
    if (existing?.kind === "hts-token") kind = "hts-token";
    const hash = hashAbi(abi);
    const record: ContractRecord = {
      id:
        input.refreshId ??
        existing?.id ??
        `contract-${NETWORKS[network].id}-${address.slice(2).toLowerCase()}`,
      name:
        input.name?.trim().slice(0, 100) ||
        existing?.name ||
        `Contract ${address.slice(0, 6)}…${address.slice(-4)}`,
      network,
      chainId: NETWORKS[network].id,
      address,
      hederaId,
      kind,
      abi,
      abiHash: hash,
      revision: `${hash}:${randomUUID()}`,
      provenance,
      importedAt: new Date().toISOString(),
    };
    assert(
      toolsFor(record).tools.length > 0,
      "ABI_UNSUPPORTED",
      "This ABI contains no supported functions.",
    );
    return this.store.saveContract(
      record,
      input.expectedRevision ?? existing?.revision ?? null,
    );
  }
  async refreshContract(id: string) {
    const contract = await this.contract(id);
    if (contract.provenance.source !== "sourcify")
      throw new WorkbenchError(
        "ABI_REQUIRED",
        "This interface was supplied or bundled. Re-import with a replacement ABI to refresh it.",
      );
    return this.importContract({
      network: contract.network,
      address: contract.address,
      name: contract.name,
      refreshId: id,
      expectedRevision: contract.revision,
    });
  }
  private async request(
    id: string,
    args: unknown,
    caller?: string,
    valueHbar = "0",
    revision?: string,
  ) {
    const { contract, tool } = await this.inspectTool(id);
    if (revision)
      assert(
        revision === contract.revision,
        "STALE_REVISION",
        "The ABI changed. Inspect the current schema and prepare again.",
      );
    if (caller)
      assert(isAddress(caller), "INPUT", "Invalid caller address.", "from");
    const encodedArgs = validateArguments(tool.parameters, args);
    const value = parseHbar(valueHbar);
    assert(
      tool.mutability === "payable" || value === 0n,
      "INPUT",
      "This function cannot receive HBAR.",
      "valueHbar",
    );
    const data = encodeFunctionData({
      abi: [tool.fn],
      functionName: tool.name,
      args: encodedArgs,
    } as any);
    return {
      contract,
      tool,
      data,
      value,
      caller: caller ? getAddress(caller) : undefined,
    };
  }
  async call(
    id: string,
    args: unknown,
    options: { from?: string; revision?: string; signal?: AbortSignal } = {},
  ): Promise<ExecutionResult> {
    const r = await this.request(id, args, options.from, "0", options.revision);
    assert(
      r.tool.action === "read",
      "PRECONDITION",
      "Writes must be simulated or prepared, then approved through the wallet.",
    );
    const key = JSON.stringify([
      r.contract.id,
      r.contract.revision,
      r.data,
      r.caller,
    ]);
    if (options.signal) return this.execute(r, false, options.signal);
    if (this.inFlight.has(key))
      return this.inFlight.get(key) as Promise<ExecutionResult>;
    const promise = this.execute(r, false);
    this.inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }
  private async execute(
    r: Awaited<ReturnType<Runtime["request"]>>,
    estimate: boolean,
    signal?: AbortSignal,
  ): Promise<ExecutionResult> {
    try {
      assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
      const client = await this.client(r.contract.network, signal);
      const response = await this.limited(
        () =>
          client.call({
            to: r.contract.address,
            data: r.data,
            account: r.caller,
            value: r.value,
          }),
        signal,
      );
      const decoded =
        r.tool.outputs.length && response.data
          ? decodeFunctionResult({
              abi: [positionalOutputs(r.tool.fn)],
              functionName: r.tool.name,
              data: response.data,
            })
          : null;
      const result: ExecutionResult = {
        schemaVersion: 1,
        contractId: r.contract.id,
        network: r.contract.network,
        chainId: r.contract.chainId,
        address: r.contract.address,
        toolId: r.tool.id,
        revision: r.contract.revision,
        signature: r.tool.signature,
        caller: r.caller,
        value: normalizeResults(r.tool.outputs, decoded),
        observedAt: new Date().toISOString(),
      };
      if (estimate) {
        try {
          result.gasEstimate = (
            await this.limited(
              () =>
                client.estimateGas({
                  to: r.contract.address,
                  data: r.data,
                  account: r.caller,
                  value: r.value,
                }),
              signal,
            )
          ).toString();
        } catch (e) {
          result.gasEstimateError = asError(e).message;
        }
      }
      assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
      return result;
    } catch (e) {
      if (signal?.aborted)
        throw new WorkbenchError("CANCELLED", "Request cancelled.");
      const bytes = (cause: any): Hex | undefined => {
        const data =
          typeof cause?.data === "string" ? cause.data : cause?.data?.data;
        return typeof data === "string" && /^0x[0-9a-fA-F]+$/.test(data)
          ? (data as Hex)
          : undefined;
      };
      const details = (e as any)?.walk?.((cause: any) => !!bytes(cause));
      const revertData = bytes(details) ?? bytes(e);
      if (revertData) {
        try {
          const decoded = decodeErrorResult({
            abi: r.contract.abi,
            data: revertData,
          });
          throw new WorkbenchError(
            "REVERT",
            `${decoded.errorName}(${JSON.stringify(jsonValue(decoded.args ?? []))})`,
          );
        } catch (decodedError) {
          if (decodedError instanceof WorkbenchError) throw decodedError;
        }
      }
      throw asError(e);
    }
  }
  async simulate(
    id: string,
    args: unknown,
    options: {
      from: string;
      valueHbar?: string;
      revision?: string;
      signal?: AbortSignal;
    },
  ) {
    assert(
      options.from,
      "INPUT",
      "Simulation needs the intended wallet address.",
      "from",
    );
    return this.execute(
      await this.request(
        id,
        args,
        options.from,
        options.valueHbar,
        options.revision,
      ),
      true,
      options.signal,
    );
  }
  async prepare(
    id: string,
    args: unknown,
    options: {
      from: string;
      valueHbar?: string;
      revision?: string;
      signal?: AbortSignal;
    },
  ): Promise<TransactionPlan> {
    assert(
      options.from,
      "INPUT",
      "Preparation needs the intended wallet address.",
      "from",
    );
    const r = await this.request(
      id,
      args,
      options.from,
      options.valueHbar,
      options.revision,
    );
    assert(
      r.tool.action === "prepare",
      "PRECONDITION",
      "Use tools call for a read function.",
    );
    const simulation = await this.execute(r, true, options.signal);
    assert(!options.signal?.aborted, "CANCELLED", "Request cancelled.");
    if (r.contract.kind === "hts-token" && r.tool.name === "associate")
      assert(
        simulation.value === "22",
        "PRECONDITION",
        `Association returned ${simulation.value}; expected SUCCESS (22).`,
      );
    const settings = await this.store.settings(),
      idPlan = randomUUID();
    const plan = {
      schemaVersion: 1 as const,
      id: idPlan,
      toolId: id,
      contractId: r.contract.id,
      revision: r.contract.revision,
      network: r.contract.network,
      chainId: r.contract.chainId,
      from: r.caller!,
      to: r.contract.address,
      signature: r.tool.signature,
      args: jsonValue(args) as Record<string, Json>,
      data: r.data,
      valueWeibar: r.value.toString(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + settings.planExpiryMs).toISOString(),
      simulation,
      reviewUrl: `${settings.webUrl.replace(/\/+$/, "")}/workbench?plan=${idPlan}`,
    };
    const complete = { ...plan, digest: planDigest(plan) };
    await this.ensureCurrentContract(r.contract);
    assert(!options.signal?.aborted, "CANCELLED", "Request cancelled.");
    await this.store.savePlan(complete);
    return complete;
  }
  async validatePlan(
    plan: TransactionPlan,
    from: string,
    chainId: number,
    signal?: AbortSignal,
  ) {
    assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
    assert(
      plan &&
        /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(plan.id) &&
        typeof plan.from === "string" &&
        isAddress(plan.from) &&
        typeof plan.to === "string" &&
        isAddress(plan.to) &&
        typeof plan.valueWeibar === "string" &&
        /^(0|[1-9][0-9]{0,77})$/.test(plan.valueWeibar),
      "INPUT",
      "Invalid transaction plan fields. Prepare a new transaction.",
    );
    assert(
      plan && plan.schemaVersion === 1 && plan.digest === planDigest(plan),
      "INPUT",
      "Plan integrity check failed. Prepare a new transaction.",
    );
    assert(
      isAddress(from) && getAddress(from) === getAddress(plan.from),
      "PRECONDITION",
      "Connect the account used to prepare this plan.",
    );
    assert(
      chainId === plan.chainId &&
        NETWORKS[networkName(plan.network)].id === chainId,
      "NETWORK_MISMATCH",
      "Wallet and plan networks do not match.",
    );
    assert(
      Number.isFinite(Date.parse(plan.expiresAt)) &&
        Date.parse(plan.expiresAt) > Date.now(),
      "PLAN_EXPIRED",
      "This plan expired. Prepare and review a fresh one.",
    );
    const settings = await this.store.settings();
    const created = Date.parse(plan.createdAt),
      expires = Date.parse(plan.expiresAt);
    assert(
      Number.isFinite(created) &&
        created <= Date.now() + 30000 &&
        expires > created &&
        expires - created <= settings.planExpiryMs + 1000,
      "INPUT",
      "Plan validity exceeds the configured expiry. Prepare a fresh transaction.",
    );
    const r = await this.request(
      plan.toolId,
      plan.args,
      from,
      formatUnits(BigInt(plan.valueWeibar), 18),
      plan.revision,
    );
    assert(
      r.contract.id === plan.contractId &&
        r.contract.chainId === plan.chainId &&
        r.contract.address === getAddress(plan.to) &&
        r.data === plan.data &&
        r.value.toString() === plan.valueWeibar &&
        r.tool.signature === plan.signature,
      "INPUT",
      "Plan fields do not match the contract and arguments.",
    );
    const simulation = await this.execute(r, true, signal);
    await this.ensureCurrentContract(r.contract);
    assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
    assert(
      expires > Date.now(),
      "PLAN_EXPIRED",
      "This plan expired during simulation. Prepare and review a fresh one.",
    );
    if (r.contract.kind === "hts-token" && r.tool.name === "associate")
      assert(
        simulation.value === "22",
        "PRECONDITION",
        "Association prerequisites changed. Prepare again.",
      );
    return {
      plan: {
        ...plan,
        simulation,
        reviewUrl: `${settings.webUrl.replace(/\/+$/, "")}/workbench?plan=${plan.id}`,
      },
      simulation,
    };
  }
  async status(network: Network, hash: Hex, signal?: AbortSignal) {
    assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
    assert(
      /^0x[0-9a-fA-F]{64}$/.test(hash),
      "INPUT",
      "Invalid transaction hash.",
    );
    try {
      const client = await this.client(network, signal);
      let receipt;
      try {
        receipt = await this.limited(
          () => client.getTransactionReceipt({ hash }),
          signal,
        );
      } catch (e) {
        assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
        if (/not found|could not be found/i.test((e as Error).message))
          return {
            hash,
            network,
            state: "pending",
            indexing: "unknown",
            explorerUrl: `${NETWORKS[network].explorer}/transaction/${hash}`,
          };
        throw asError(e);
      }
      const record = await this.store.transaction(network, hash);
      if (record?.planId) {
        const plan = await this.store.plan(record.planId),
          tx = await this.limited(
            () => client.getTransaction({ hash }),
            signal,
          );
        assert(
          getAddress(tx.from) === getAddress(plan.from) &&
            tx.to &&
            getAddress(tx.to) === getAddress(plan.to) &&
            tx.input === plan.data &&
            tx.value.toString() === plan.valueWeibar,
          "PRECONDITION",
          "Receipt belongs to a transaction that does not match this plan.",
        );
      }
      let indexed = false;
      try {
        const metadata = await this.fetchJson(
          `${NETWORKS[network].mirror}/contracts/results/${hash}`,
          signal,
        );
        indexed = !!metadata;
      } catch {
        assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
        /* Receipt and mirror indexing are separate states. */
      }
      assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
      return {
        hash,
        network,
        state: receipt.status === "success" ? "confirmed" : "reverted",
        indexing: indexed ? "indexed" : "pending",
        receipt: jsonValue(receipt),
        explorerUrl: `${NETWORKS[network].explorer}/transaction/${hash}`,
      };
    } catch (error) {
      assert(!signal?.aborted, "CANCELLED", "Request cancelled.");
      throw asError(error);
    }
  }
  async account(network: Network, address: string, signal?: AbortSignal) {
    assert(isAddress(address), "INPUT", "Invalid account address.");
    const client = await this.client(network, signal);
    const balance = await this.limited(
      () => client.getBalance({ address: getAddress(address) }),
      signal,
    );
    return {
      address: getAddress(address),
      network,
      balanceWeibar: balance.toString(),
      balanceHbar: formatUnits(balance, 18),
    };
  }
  async quote(
    network: Network,
    amountHbar: string,
    slippageBps: number = DEFAULTS.slippageBps,
    signal?: AbortSignal,
  ): Promise<SwapQuote> {
    assert(
      Number.isInteger(slippageBps) && slippageBps >= 0 && slippageBps <= 1000,
      "INPUT",
      "Slippage must be between 0 and 1000 basis points.",
    );
    const amount = hbarToTinybar(amountHbar);
    assert(
      amount > 0n,
      "INPUT",
      "Enter an amount greater than zero.",
      "amountHbar",
    );
    const n = NETWORKS[network],
      contract = await this.contract(`saucerswap-${network}`);
    const tool = toolsFor(contract).tools.find(
      (t) => t.signature === "getAmountsOut(uint256,address[])",
    )!;
    const path = [knownTokenAddress(n.whbarId), knownTokenAddress(n.sauceId)];
    const result = await this.call(
      tool.id,
      {
        amountIn: amount.toString(),
        path,
      },
      { signal },
    );
    const amounts = result.value as string[],
      amountOut = BigInt(amounts.at(-1)!);
    assert(
      amountOut > 0n,
      "PRECONDITION",
      "This route currently has no usable quote.",
    );
    return {
      network,
      chainId: n.id,
      amountHbar,
      amountInTinybar: amount.toString(),
      amountOutRaw: amountOut.toString(),
      amountOutDisplay: formatUnits(amountOut, 6),
      minimumOutRaw: (
        (amountOut * BigInt(10000 - slippageBps)) /
        10000n
      ).toString(),
      slippageBps,
      quotedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULTS.quoteExpiryMs).toISOString(),
      path,
      contractId: contract.id,
    };
  }
  async association(network: Network, from: string, signal?: AbortSignal) {
    const c = await this.contract(`sauce-${network}`),
      tool = toolsFor(c).tools.find((t) => t.name === "isAssociated")!;
    return this.call(tool.id, {}, { from, signal });
  }
  async prepareSwap(
    network: Network,
    from: string,
    quote: SwapQuote,
    signal?: AbortSignal,
  ) {
    assert(
      quote.network === network && Date.parse(quote.expiresAt) > Date.now(),
      "PLAN_EXPIRED",
      "Quote expired or belongs to another network. Request a fresh quote.",
    );
    assert(
      (await this.association(network, from, signal)).value === true,
      "PRECONDITION",
      "Associate the wallet with SAUCE before preparing the swap.",
    );
    const fresh = await this.quote(
      network,
      quote.amountHbar,
      quote.slippageBps,
      signal,
    );
    assert(
      BigInt(fresh.minimumOutRaw) > 0n,
      "PRECONDITION",
      "The amount is too small for a protected swap.",
    );
    const c = await this.contract(`saucerswap-${network}`),
      tool = toolsFor(c).tools.find((t) => t.name === "swapExactETHForTokens")!;
    return this.prepare(
      tool.id,
      {
        amountOutMin: fresh.minimumOutRaw,
        path: fresh.path,
        to: getAddress(from),
        deadline: String(
          Math.floor(Date.now() / 1000) + DEFAULTS.swapDeadlineSeconds,
        ),
      },
      { from, valueHbar: fresh.amountHbar, signal },
    );
  }
  async doctor(network?: Network) {
    const selected = network ?? (await this.store.settings()).network;
    const checks: { name: string; ok: boolean; message: string }[] = [];
    checks.push({
      name: "runtime",
      ok: Number(process.versions.node.split(".")[0]) >= 22,
      message: `Node ${process.versions.node}; Node 24 LTS recommended`,
    });
    try {
      await this.client(selected);
      checks.push({
        name: "network",
        ok: true,
        message: `${NETWORKS[selected].name} (${NETWORKS[selected].id})`,
      });
    } catch (e) {
      checks.push({ name: "network", ok: false, message: asError(e).message });
    }
    try {
      await this.store.contracts();
      checks.push({
        name: "registry",
        ok: true,
        message: "Local imports and bundled examples are readable",
      });
    } catch (e) {
      checks.push({ name: "registry", ok: false, message: asError(e).message });
    }
    const ai = this.aiConfiguration();
    return {
      network: selected,
      checks,
      ready: checks.every((c) => c.ok),
      assistant: {
        enabled: !!ai,
        message: ai
          ? `${ai.provider}: ${ai.model}`
          : "Optional: configure a provider key and WORKBENCH_AI_MODEL; forms and CLI work without them.",
      },
    };
  }
  aiConfiguration() {
    const provider = process.env.WORKBENCH_AI_PROVIDER ?? "openai",
      model = process.env.WORKBENCH_AI_MODEL;
    const key =
      provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : provider === "gemini"
          ? process.env.GEMINI_API_KEY
          : process.env.OPENAI_API_KEY;
    return key && model && ["openai", "anthropic", "gemini"].includes(provider)
      ? { provider, model, key }
      : null;
  }
}
