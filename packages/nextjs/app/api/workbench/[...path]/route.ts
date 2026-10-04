import { type NextRequest } from "next/server";
import {
  toolsFor,
  networkName,
  assert,
  WorkbenchError,
  skillView,
  type TransactionPlan,
  type SwapQuote,
} from "@sh/core";
import { runtime as engine, body, guard, success, failure } from "@/lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: NextRequest, context: Context) {
  try {
    guard(request);
    const { path } = await context.params,
      query = request.nextUrl.searchParams;
    const data = request.method === "POST" ? await body(request) : {};
    const selectedNetwork = () =>
      networkName(data.network ?? query.get("network") ?? "testnet");
    if (path[0] === "skills" && request.method === "GET") {
      const view = await skillView(engine, query.get("contract") ?? "");
      if (path[1] === "markdown")
        return new Response(view.markdown, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": 'attachment; filename="SKILL.md"',
            "Cache-Control": "no-store",
          },
        });
      if (path.length === 1) return success(view);
    }
    if (path[0] === "state" && request.method === "GET") {
      const settings = await engine.store.settings();
      return success({
        contracts: (await engine.store.contracts()).map(
          ({ abi: _abi, ...c }) => c,
        ),
        defaultNetwork: settings.network,
        polling: {
          intervalMs: settings.receiptPollMs,
          budgetMs: settings.receiptPollBudgetMs,
        },
        assistant: !!engine.aiConfiguration(),
        transactions: await engine.store.transactions(),
      });
    }
    if (path[0] === "contracts") {
      if (path.length === 1 && request.method === "POST")
        return success(
          await engine.importContract({
            network: selectedNetwork(),
            address: data.address,
            name: data.name,
            abi: data.abi,
          }),
        );
      if (path[1] && request.method === "GET") {
        const contract = await engine.contract(path[1]);
        return success({ contract, ...toolsFor(contract) });
      }
      if (path[1] && request.method === "DELETE") {
        await engine.store.removeContract(path[1], query.get("revision")!);
        return success({ removed: path[1] });
      }
      if (path[2] === "refresh" && request.method === "POST")
        return success(await engine.refreshContract(path[1]));
    }
    if (path[0] === "tools" && path[1]) {
      if (request.method === "GET")
        return success(await engine.inspectTool(path[1]));
      if (request.method === "POST") {
        const options = {
          from: data.from,
          valueHbar: data.valueHbar ?? "0",
          revision: data.revision,
          signal: request.signal,
        };
        if (path[2] === "call")
          return success(await engine.call(path[1], data.arguments, options));
        if (path[2] === "simulate")
          return success(
            await engine.simulate(path[1], data.arguments, options),
          );
        if (path[2] === "prepare")
          return success(
            await engine.prepare(path[1], data.arguments, options),
          );
      }
    }
    if (path[0] === "plans") {
      if (path[1] && request.method === "GET")
        return success(await engine.store.plan(path[1]));
      if (path[1] === "validate" && request.method === "POST") {
        const validated = await engine.validatePlan(
          data.plan as TransactionPlan,
          data.from,
          data.chainId,
          request.signal,
        );
        await engine.store.savePlan(validated.plan);
        return success(validated);
      }
    }
    if (path[0] === "account" && request.method === "GET")
      return success(
        await engine.account(
          selectedNetwork(),
          query.get("address") ?? "",
          request.signal,
        ),
      );
    if (path[0] === "swap") {
      const network = selectedNetwork();
      if (path[1] === "quote" && request.method === "POST")
        return success(
          await engine.quote(
            network,
            data.amountHbar,
            data.slippageBps,
            request.signal,
          ),
        );
      if (path[1] === "association" && request.method === "GET")
        return success(
          await engine.association(
            network,
            query.get("from") ?? "",
            request.signal,
          ),
        );
      if (path[1] === "prepare" && request.method === "POST")
        return success(
          await engine.prepareSwap(
            network,
            data.from,
            data.quote as SwapQuote,
            request.signal,
          ),
        );
      if (path[1] === "associate" && request.method === "POST") {
        const contract = await engine.contract(`sauce-${network}`),
          tool = toolsFor(contract).tools.find((t) => t.name === "associate")!;
        return success(
          await engine.prepare(
            tool.id,
            {},
            {
              from: data.from,
              revision: contract.revision,
              signal: request.signal,
            },
          ),
        );
      }
    }
    if (path[0] === "transactions") {
      if (request.method === "POST") {
        const plan = await engine.store.plan(data.planId);
        assert(
          plan.network === selectedNetwork(),
          "NETWORK_MISMATCH",
          "Journal network does not match the plan.",
        );
        const record = {
          hash: data.hash,
          network: plan.network,
          planId: plan.id,
          submittedAt: new Date().toISOString(),
        };
        await engine.store.saveTransaction(record);
        return success(record);
      }
      if (path[1] && request.method === "GET")
        return success(
          await engine.status(
            selectedNetwork(),
            path[1] as `0x${string}`,
            request.signal,
          ),
        );
    }
    return failure(
      new WorkbenchError("NOT_FOUND", "Unknown workbench operation."),
    );
  } catch (error) {
    return failure(error);
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
