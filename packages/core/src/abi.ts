import {
  keccak256,
  toHex,
  type Abi,
  type AbiFunction,
  type AbiParameter,
} from "viem";
import { DEFAULTS } from "./networks.js";
import { assert, WorkbenchError } from "./errors.js";
import type {
  ContractRecord,
  Json,
  Parameter,
  Schema,
  ToolCatalog,
} from "./types.js";

export { validateValue, validateArguments } from "./validation.js";

export function normalizeAbi(input: unknown): Abi {
  const raw = Array.isArray(input) ? input : (input as any)?.abi;
  assert(
    Array.isArray(raw) && raw.length > 0,
    "ABI_INVALID",
    "Supply an ABI array or an artifact containing a nonempty abi array.",
  );
  assert(
    Buffer.byteLength(JSON.stringify(raw)) <= DEFAULTS.maxAbiBytes,
    "ABI_INVALID",
    "ABI exceeds the 1 MiB limit.",
  );
  assert(
    raw.every((x) => x && typeof x === "object" && typeof x.type === "string"),
    "ABI_INVALID",
    "Every ABI entry needs a type.",
  );
  for (const entry of raw.filter((x) => x.type === "function")) {
    assert(
      typeof entry.name === "string" &&
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(entry.name),
      "ABI_INVALID",
      "Invalid function name.",
    );
    assert(
      Array.isArray(entry.inputs) && Array.isArray(entry.outputs),
      "ABI_INVALID",
      `${entry.name} needs inputs and outputs arrays.`,
    );
    assert(
      ["view", "pure", "nonpayable", "payable"].includes(entry.stateMutability),
      "ABI_INVALID",
      `${entry.name} needs a supported stateMutability.`,
    );
  }
  return JSON.parse(JSON.stringify(raw));
}
export function hashAbi(abi: Abi) {
  return keccak256(toHex(JSON.stringify(abi)));
}
function keys(params: readonly AbiParameter[]): string[] {
  const names = params.map((p) => p.name ?? "");
  const safe =
    names.every(
      (n) =>
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n) &&
        !["__proto__", "constructor", "prototype"].includes(n),
    ) && new Set(names).size === names.length;
  return safe ? names : params.map((_p, i) => `arg${i}`);
}
export function parameterTree(
  params: readonly AbiParameter[],
  depth = 0,
): Parameter[] {
  const names = keys(params);
  return params.map((p, i) => parameter(p, names[i], depth));
}
function parameter(p: AbiParameter, key: string, depth: number): Parameter {
  assert(
    depth <= DEFAULTS.maxParameterDepth,
    "ABI_UNSUPPORTED",
    "Parameter nesting exceeds the supported limit.",
  );
  const type =
    p.type === "uint" ? "uint256" : p.type === "int" ? "int256" : p.type;
  assert(
    typeof type === "string",
    "ABI_INVALID",
    "ABI parameter needs a type.",
  );
  const base = { key, name: p.name ?? "", type };
  const array = /^(.*)\[(\d*)\]$/.exec(type);
  if (array) {
    const length = array[2] ? Number(array[2]) : undefined;
    assert(
      length === undefined ||
        (Number.isSafeInteger(length) && length <= DEFAULTS.maxArrayLength),
      "ABI_UNSUPPORTED",
      "Fixed array is too large.",
    );
    const item = parameter(
      { ...p, type: array[1] } as AbiParameter,
      "item",
      depth + 1,
    );
    return {
      ...base,
      item,
      length,
      schema: {
        type: "array",
        items: item.schema,
        maxItems: length ?? DEFAULTS.maxArrayLength,
        ...(length !== undefined ? { minItems: length } : {}),
      },
    };
  }
  if (type === "tuple") {
    assert(
      Array.isArray((p as any).components),
      "ABI_INVALID",
      "Tuple needs components.",
    );
    const children = parameterTree((p as any).components, depth + 1);
    return { ...base, children, schema: objectSchema(children) };
  }
  const int = /^(u?int)(\d+)$/.exec(type);
  let schema: Schema;
  if (int) {
    const bits = Number(int[2]);
    assert(
      bits >= 8 && bits <= 256 && bits % 8 === 0,
      "ABI_INVALID",
      `Invalid integer type ${type}.`,
    );
    const signed = int[1] === "int";
    schema = {
      type: "string",
      pattern: signed ? "^(0|-?[1-9][0-9]*)$" : "^(0|[1-9][0-9]*)$",
      maxLength: 79,
      description: `${type}, encoded as a decimal string; bounds checked before execution.`,
    };
  } else if (type === "address")
    schema = {
      type: "string",
      pattern: "^0x[0-9a-fA-F]{40}$",
      description: "EVM address",
    };
  else if (type === "bool") schema = { type: "boolean" };
  else if (type === "string") schema = { type: "string", maxLength: 65536 };
  else if (type === "bytes")
    schema = {
      type: "string",
      pattern: "^0x([0-9a-fA-F]{2})*$",
      maxLength: 131074,
    };
  else if (/^bytes([1-9]|[12]\d|3[0-2])$/.test(type)) {
    const size = Number(type.slice(5));
    schema = { type: "string", pattern: `^0x[0-9a-fA-F]{${size * 2}}$` };
  } else
    throw new WorkbenchError(
      "ABI_UNSUPPORTED",
      `Type ${type} is not supported.`,
    );
  return { ...base, schema: { ...schema, title: p.name || key } };
}
export function objectSchema(params: Parameter[]): Schema {
  return {
    type: "object",
    properties: Object.fromEntries(params.map((p) => [p.key, p.schema])),
    required: params.map((p) => p.key),
    additionalProperties: false,
  };
}
function canonical(p: AbiParameter): string {
  return p.type.startsWith("tuple")
    ? `(${((p as any).components ?? []).map(canonical).join(",")})${p.type.slice(5)}`
    : p.type.replace(/^(u?int)(?=\[|$)/, "$1256");
}
export function functionSignature(fn: AbiFunction): string {
  return `${fn.name}(${fn.inputs.map(canonical).join(",")})`;
}
const cache = new Map<string, ToolCatalog>();
export function toolsFor(contract: ContractRecord): ToolCatalog {
  const cacheKey = `${contract.id}:${contract.revision}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;
  const catalog: ToolCatalog = { tools: [], unsupported: [] };
  const signatures = new Set<string>();
  for (const entry of contract.abi) {
    if (entry.type !== "function") continue;
    try {
      const fn = entry as AbiFunction;
      const signature = functionSignature(fn);
      assert(
        !signatures.has(signature),
        "ABI_INVALID",
        `Duplicate signature ${signature}.`,
      );
      signatures.add(signature);
      const parameters = parameterTree(fn.inputs),
        outputs = parameterTree(fn.outputs);
      const action = ["view", "pure"].includes(fn.stateMutability)
        ? "read"
        : "prepare";
      const suffix = keccak256(
        toHex(
          `${contract.chainId}:${contract.address.toLowerCase()}:${signature}:${action}`,
        ),
      ).slice(2, 18);
      catalog.tools.push({
        schemaVersion: 1,
        id: `${action}_${fn.name.replace(/[^\w]/g, "_").slice(0, 24)}_${suffix}`,
        contractId: contract.id,
        revision: contract.revision,
        name: fn.name,
        signature,
        action,
        mutability: fn.stateMutability,
        parameters,
        outputs,
        inputSchema: objectSchema(parameters),
        outputSchema:
          outputs.length === 1
            ? outputs[0].schema
            : {
                type: "array",
                prefixItems: outputs.map((p) => p.schema),
                minItems: outputs.length,
                maxItems: outputs.length,
              },
        fn,
      });
    } catch (e) {
      catalog.unsupported.push({
        name: (entry as any).name,
        reason: (e as Error).message,
      });
    }
  }
  cache.set(cacheKey, catalog);
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  return catalog;
}
/** Decode tuples positionally, then restore the catalog's stable field keys. */
export function positionalOutputs(fn: AbiFunction): AbiFunction {
  const anonymous = (p: AbiParameter): AbiParameter =>
    ({
      ...p,
      name: "",
      ...("components" in p ? { components: p.components.map(anonymous) } : {}),
    }) as AbiParameter;
  return { ...fn, outputs: fn.outputs.map(anonymous) };
}
export function normalizeOutput(p: Parameter, value: any): Json {
  if (p.item) return value.map((v: unknown) => normalizeOutput(p.item!, v));
  if (p.children)
    return Object.fromEntries(
      p.children.map((child, index) => [
        child.key,
        normalizeOutput(child, value[index]),
      ]),
    );
  return jsonValue(value);
}
export function normalizeResults(outputs: Parameter[], value: any): Json {
  if (!outputs.length) return null;
  return outputs.length === 1
    ? normalizeOutput(outputs[0], value)
    : outputs.map((p, i) => normalizeOutput(p, value[i]));
}
export function jsonValue(value: any): Json {
  if (typeof value === "bigint") return value.toString();
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, jsonValue(v)]),
    );
  return value;
}
