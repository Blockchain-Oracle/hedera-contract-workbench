import { getAddress, isAddress } from "viem";
import { DEFAULTS } from "./networks.js";
import { assert } from "./errors.js";
import type { Parameter } from "./types.js";

function validateObject(
  params: Parameter[],
  input: unknown,
  path: string,
): unknown[] {
  assert(
    input !== null && typeof input === "object" && !Array.isArray(input),
    "INPUT",
    "Expected an object with named fields.",
    path,
  );
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj))
    assert(
      params.some((p) => p.key === key),
      "INPUT",
      `Unknown argument ${key}.`,
      `${path}.${key}`,
    );
  return params.map((p) => {
    assert(
      Object.hasOwn(obj, p.key),
      "INPUT",
      `Missing argument ${p.key}.`,
      `${path}.${p.key}`,
    );
    return validateValue(p, obj[p.key], `${path}.${p.key}`);
  });
}
export function validateValue(
  p: Parameter,
  input: unknown,
  path: string,
): unknown {
  const label = path.replace(/^arguments\./, "");
  assert(
    input !== null && input !== undefined,
    "INPUT",
    `${label} is required.`,
    path,
  );
  if (p.item) {
    assert(Array.isArray(input), "INPUT", "Expected an array.", path);
    assert(
      input.length <= DEFAULTS.maxArrayLength &&
        (p.length === undefined || input.length === p.length),
      "INPUT",
      `Expected ${p.length ?? `at most ${DEFAULTS.maxArrayLength}`} items.`,
      path,
    );
    return input.map((x, i) => validateValue(p.item!, x, `${path}[${i}]`));
  }
  if (p.children) return validateObject(p.children, input, path);
  if (input === "" && p.type !== "string")
    assert(false, "INPUT", `${label} is required.`, path);
  const int = /^(u?int)(\d+)$/.exec(p.type);
  if (int) {
    assert(
      typeof input === "string" &&
        input.length <= 79 &&
        new RegExp(p.schema.pattern).test(input),
      "INPUT",
      "Use a canonical decimal string for an ABI integer.",
      path,
    );
    const value = BigInt(input),
      bits = BigInt(int[2]),
      signed = int[1] === "int";
    const min = signed ? -(1n << (bits - 1n)) : 0n,
      max = signed ? (1n << (bits - 1n)) - 1n : (1n << bits) - 1n;
    assert(
      value >= min && value <= max,
      "INPUT",
      `${p.type} is out of range.`,
      path,
    );
    return value;
  }
  if (p.type === "bool") {
    assert(
      typeof input === "boolean",
      "INPUT",
      "Expected a JSON boolean.",
      path,
    );
    return input;
  }
  assert(
    typeof input === "string",
    "INPUT",
    `Expected a ${p.type} string.`,
    path,
  );
  if (p.type === "address") {
    assert(isAddress(input), "INPUT", "Invalid EVM address or checksum.", path);
    return getAddress(input);
  }
  if (p.schema.pattern)
    assert(
      new RegExp(p.schema.pattern).test(input),
      "INPUT",
      `Invalid ${p.type} value.`,
      path,
    );
  if (p.schema.maxLength)
    assert(
      input.length <= p.schema.maxLength,
      "INPUT",
      "Value is too long.",
      path,
    );
  return input;
}
export function validateArguments(
  params: Parameter[],
  input: unknown,
): unknown[] {
  return validateObject(params, input, "arguments");
}

export type ArgumentIssue = { path: string; message: string };
/** Same value codec as execution; collect all independently invalid fields. */
export function argumentIssues(
  params: Parameter[],
  input: unknown,
): ArgumentIssue[] {
  const issues: ArgumentIssue[] = [];
  function object(fields: Parameter[], value: unknown, path: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push({ path, message: "Expected an object with named fields." });
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record))
      if (!fields.some((p) => p.key === key))
        issues.push({
          path: `${path}.${key}`,
          message: `Unknown argument ${key}.`,
        });
    for (const p of fields) {
      const childPath = `${path}.${p.key}`;
      if (!Object.hasOwn(record, p.key))
        issues.push({
          path: childPath,
          message: `${p.name || p.key} is required.`,
        });
      else visit(p, record[p.key], childPath);
    }
  }
  function visit(p: Parameter, value: unknown, path: string) {
    if (p.children && value !== null && value !== undefined)
      return object(p.children, value, path);
    if (p.item && Array.isArray(value)) {
      if (
        value.length > DEFAULTS.maxArrayLength ||
        (p.length !== undefined && value.length !== p.length)
      )
        issues.push({
          path,
          message: `Expected ${p.length ?? `at most ${DEFAULTS.maxArrayLength}`} items.`,
        });
      value.forEach((item, index) => visit(p.item!, item, `${path}[${index}]`));
      return;
    }
    try {
      validateValue(p, value, path);
    } catch (error) {
      issues.push({ path, message: (error as Error).message });
    }
  }
  object(params, input, "arguments");
  return issues;
}
export { parseHbar } from "./networks.js";
