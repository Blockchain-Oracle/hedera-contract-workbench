export class WorkbenchError extends Error {
  constructor(
    public code: string,
    message: string,
    public path?: string,
    public retryable = false,
    public nextAction?: string,
  ) {
    super(message);
    this.name = "WorkbenchError";
  }
}
export function cleanMessage(message: string): string {
  return message.replace(/https?:\/\/[^\s)\]]+/g, "[endpoint]").slice(0, 1200);
}
export function asError(error: unknown): WorkbenchError {
  if (error instanceof WorkbenchError) return error;
  const e = error as any;
  // A persistent Next development Runtime may belong to a prior module instance.
  if (
    e?.name === "WorkbenchError" &&
    typeof e.code === "string" &&
    typeof e.message === "string"
  )
    return new WorkbenchError(
      e.code,
      e.message,
      e.path,
      e.retryable === true,
      e.nextAction,
    );
  // viem's outer shortMessage can hide Hedera's actionable RPC cause.
  const causes: string[] = [];
  const seen = new Set<unknown>();
  let cause = e;
  while (cause && !seen.has(cause) && seen.size < 16) {
    seen.add(cause);
    for (const value of [cause.message, cause.shortMessage, cause.details])
      if (typeof value === "string") causes.push(value);
    cause = cause.cause;
  }
  const revert =
    typeof e?.walk === "function"
      ? e.walk((x: any) => x.name === "ContractFunctionRevertedError")
      : undefined;
  if (revert?.data?.errorName) {
    const args = JSON.stringify(revert.data.args ?? [], (_k, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    return new WorkbenchError(
      "REVERT",
      `${revert.data.errorName}${args}`,
      undefined,
      false,
      "Check the arguments and caller permissions.",
    );
  }
  if (/sender account (?:not found|does not exist)/i.test(causes.join("\n")))
    return new WorkbenchError(
      "PRECONDITION",
      "The sender account does not exist on the selected Hedera network.",
      "from",
      false,
      "For an ordinary read, omit the caller. For a caller-scoped read or transaction, check the selected network and create/fund that Hedera account. Connecting MetaMask alone does not create an account on Hedera.",
    );
  if (
    /insufficient (?:funds|balance)|insufficient_account_balance/i.test(
      causes.join("\n"),
    )
  )
    return new WorkbenchError(
      "PRECONDITION",
      "The sender has insufficient funds for this operation on the selected network.",
      "from",
      false,
      "Check the transaction value and fund the intended account for value and network fees, then simulate again.",
    );
  const message = cleanMessage(
    e?.shortMessage ?? e?.message ?? "The operation failed.",
  );
  if (e?.code === "ENOENT" || e?.code === "EISDIR")
    return new WorkbenchError(
      "INPUT",
      "Input file was not found or is not a regular file. Check the path.",
    );
  const isRevert = /revert/i.test(message);
  return new WorkbenchError(
    isRevert ? "REVERT" : "TRANSPORT",
    message,
    undefined,
    !isRevert,
    isRevert
      ? "Check the arguments, units, and caller permissions."
      : "Check the endpoint and try the read again. Do not resend a transaction.",
  );
}
export function errorEnvelope(error: unknown) {
  const e = asError(error);
  return {
    schemaVersion: 1,
    ok: false as const,
    error: {
      code: e.code,
      message: e.message,
      path: e.path,
      retryable: e.retryable,
      nextAction: e.nextAction,
    },
  };
}
export function assert(
  condition: unknown,
  code: string,
  message: string,
  path?: string,
): asserts condition {
  if (!condition) throw new WorkbenchError(code, message, path);
}
export function exitCode(error: unknown): number {
  const code = asError(error).code;
  if (code === "TRANSPORT") return 4;
  if (code === "REVERT") return 5;
  return [
    "NETWORK_MISMATCH",
    "STALE_REVISION",
    "PLAN_EXPIRED",
    "PRECONDITION",
    "REGISTRY_BUSY",
  ].includes(code)
    ? 3
    : 2;
}
