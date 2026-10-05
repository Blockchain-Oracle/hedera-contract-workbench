import { assert } from "@sh/core";

type Environment = Record<string, string | undefined>;

/** Vercel never exposes the local single-owner filesystem as shared writable state. */
export function isHostedDemo(env: Environment = process.env) {
  return env.VERCEL === "1" || env.WORKBENCH_HOSTED_DEMO === "1";
}

export function checkOrigin(
  protocol: string,
  host: string,
  origin: string | null,
  fetchSite: string | null,
  env: Environment = process.env,
) {
  const incoming = new URL(`${protocol}//${host}`);
  const configured = [
    env.WORKBENCH_WEB_URL,
    ...(env.VERCEL === "1"
      ? [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].map((value) =>
          value ? `https://${value}` : undefined,
        )
      : []),
  ]
    .filter((value): value is string => !!value)
    .map((value) => new URL(value));
  const match = configured.find((url) => url.host === incoming.host);
  assert(
    ["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) || match,
    "PRECONDITION",
    "This host is not configured for the workbench.",
  );
  const expectedOrigin = match?.origin ?? incoming.origin;
  assert(
    !origin || origin === expectedOrigin,
    "PRECONDITION",
    "Open the workbench on its configured origin before continuing.",
  );
  assert(
    !fetchSite || fetchSite === "same-origin" || fetchSite === "none",
    "PRECONDITION",
    "Cross-site requests are not accepted.",
  );
}

export function checkDemoOperation(
  method: string,
  path: string[],
  hosted = isHostedDemo(),
) {
  if (!hosted) return;
  const readable =
    method === "GET" &&
    ((path.length === 1 && path[0] === "state") ||
      (path[0] === "skills" &&
        (path.length === 1 || (path.length === 2 && path[1] === "markdown"))) ||
      (path.length === 2 && ["contracts", "tools"].includes(path[0])));
  const executable =
    method === "POST" &&
    path.length === 3 &&
    path[0] === "tools" &&
    ["call", "simulate"].includes(path[2]);
  assert(
    readable || executable,
    "PRECONDITION",
    "This public preview supports bundled contract reads and unsigned simulation. Run the template locally to import contracts, enable chat, or prepare and submit wallet transactions. See /docs/quickstart.",
  );
}
