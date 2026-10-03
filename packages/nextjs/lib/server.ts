import { Runtime, WorkbenchError, assert, errorEnvelope } from "@sh/core";
import { NextResponse, type NextRequest } from "next/server";
const globalRuntime = globalThis as unknown as { workbenchRuntime?: Runtime };
export const runtime = (globalRuntime.workbenchRuntime ??= new Runtime());
export function guard(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? "";
  const configured = process.env.WORKBENCH_WEB_URL
    ? new URL(process.env.WORKBENCH_WEB_URL)
    : null;
  const incoming = new URL(`${request.nextUrl.protocol}//${host}`);
  assert(
    ["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) ||
      incoming.host === configured?.host,
    "PRECONDITION",
    "This host is not configured for the workbench.",
  );
  const expectedOrigin =
    incoming.host === configured?.host ? configured.origin : incoming.origin;
  assert(
    !origin || origin === expectedOrigin,
    "PRECONDITION",
    `Open the workbench on its configured origin before continuing. Expected ${expectedOrigin}; received ${origin}.`,
  );
  const fetchSite = request.headers.get("sec-fetch-site");
  assert(
    !fetchSite || fetchSite === "same-origin" || fetchSite === "none",
    "PRECONDITION",
    "Cross-site requests are not accepted.",
  );
}
export async function body(request: NextRequest): Promise<Record<string, any>> {
  guard(request);
  assert(
    request.headers.get("content-type")?.includes("application/json"),
    "INPUT",
    "Send application/json.",
  );
  const reader = request.body?.getReader();
  assert(reader, "INPUT", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 1048576) {
      await reader.cancel();
      throw new WorkbenchError("INPUT", "Request exceeds 1 MiB.");
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    assert(
      parsed && typeof parsed === "object" && !Array.isArray(parsed),
      "INPUT",
      "Send a JSON object.",
    );
    return parsed;
  } catch (e) {
    if (e instanceof WorkbenchError) throw e;
    throw new WorkbenchError("INPUT", "Malformed JSON.");
  }
}
export function success(data: unknown) {
  return NextResponse.json(
    { schemaVersion: 1, ok: true, data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export function failure(error: unknown) {
  const envelope = errorEnvelope(error);
  return NextResponse.json(envelope, {
    status:
      envelope.error.code === "NOT_FOUND"
        ? 404
        : envelope.error.code === "TRANSPORT"
          ? 502
          : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
