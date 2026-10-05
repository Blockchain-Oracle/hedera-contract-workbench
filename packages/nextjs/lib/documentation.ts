import { readFile } from "node:fs/promises";
import path from "node:path";

export const documents = [
  { slug: "quickstart", title: "Quickstart", file: "docs/QUICKSTART.md" },
  { slug: "overview", title: "Product overview", file: "README.md" },
  { slug: "cli", title: "CLI commands", file: "docs/CLI.md" },
  { slug: "agents", title: "Agents & MCP", file: "docs/AGENTS.md" },
  { slug: "architecture", title: "Architecture", file: "docs/ARCHITECTURE.md" },
  {
    slug: "configuration",
    title: "Configuration",
    file: "docs/CONFIGURATION.md",
  },
  { slug: "support", title: "Support matrix", file: "docs/SUPPORT.md" },
  { slug: "hosting", title: "Hosting", file: "docs/HOSTING.md" },
  {
    slug: "submission",
    title: "Release readiness",
    file: "docs/SUBMISSION.md",
  },
];

export async function documentSource(file: string) {
  // Documentation pages are statically generated; no runtime filesystem reads.
  return readFile(
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..", file),
    "utf8",
  );
}

export function documentLink(file: string, href: string, image = false) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return href;
  const [target, fragment] = href.split("#");
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(file), target),
  );
  const doc = documents.find((item) => item.file === resolved);
  const suffix = fragment ? `#${fragment}` : "";
  if (doc && !image) return `/docs/${doc.slug}${suffix}`;
  if (image && resolved.startsWith("packages/nextjs/public/")) {
    return "/" + resolved.slice("packages/nextjs/public/".length) + suffix;
  }
  const repository = image
    ? "https://raw.githubusercontent.com/Blockchain-Oracle/hedera-contract-workbench/main/"
    : "https://github.com/Blockchain-Oracle/hedera-contract-workbench/blob/main/";
  return repository + resolved + suffix;
}
