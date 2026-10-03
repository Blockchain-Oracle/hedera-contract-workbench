export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly path?: string,
    readonly nextAction?: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  data?: unknown,
  method = data === undefined ? "GET" : "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/workbench/${path}`, {
    method,
    ...(data !== undefined
      ? {
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
    signal,
  });
  const envelope = await response.json();
  if (!envelope.ok)
    throw new ApiError(
      envelope.error.message,
      envelope.error.code,
      envelope.error.path,
      envelope.error.nextAction,
    );
  return envelope.data;
}
