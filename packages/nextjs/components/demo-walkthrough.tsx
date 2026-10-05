import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Braces, ShieldCheck, Terminal } from "lucide-react";

export function DemoWalkthrough() {
  return (
    <>
      <section
        id="walkthrough"
        aria-labelledby="workspace-title"
        className="scroll-mt-6 py-12 sm:py-16"
      >
        <div className="grid items-start gap-6 md:grid-cols-[1fr_1.1fr] md:gap-12">
          <div>
            <p className="text-xs text-muted-foreground">01 / The workspace</p>
            <h2
              id="workspace-title"
              className="mt-4 text-3xl font-medium tracking-tight"
            >
              Your ABI becomes
              <br />a usable interface.
            </h2>
          </div>
          <div className="text-sm leading-7 text-muted-foreground">
            <p>
              Import a deployed contract locally. Its functions, argument types
              and results appear together. Tuples, arrays and overloads come
              from the ABI; the app does not assume your contract is a token or
              a swap.
            </p>
            <Link
              href="/workbench?view=functions&contract=saucerswap-testnet"
              className="mt-4 inline-flex items-center gap-2 font-medium text-foreground"
            >
              Explore the workspace{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ProductScreen
          src="/demo/functions.png"
          alt="The actual Workbench function navigator, factory() read and returned testnet address"
          caption="Captured from the public testnet preview · 5 October 2026 · successful factory() read"
        />
      </section>
      <section
        id="agents"
        aria-labelledby="agent-title"
        className="scroll-mt-6 border-t border-border py-12 sm:py-16"
      >
        <div className="grid items-start gap-6 md:grid-cols-[1fr_1.1fr] md:gap-12">
          <div>
            <p className="text-xs text-muted-foreground">02 / Your agent</p>
            <h2
              id="agent-title"
              className="mt-4 text-3xl font-medium tracking-tight"
            >
              The same contract.
              <br />
              Your preferred tools.
            </h2>
          </div>
          <div className="text-sm leading-7 text-muted-foreground">
            <p>
              Install the portable skill for Codex, Claude Code or Cursor,
              connect a local MCP client, or use the CLI. Agents inspect the
              current schema before calling a function. Import another ABI and
              the catalog changes; the skill stays the same.
            </p>
            <Link
              href="/workbench?view=agents&contract=saucerswap-testnet"
              className="mt-4 inline-flex items-center gap-2 font-medium text-foreground"
            >
              Explore agent setup{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ProductScreen
          src="/demo/agents.png"
          alt="The actual agent setup screen with Codex, Claude Code and Cursor selection and copyable installation command"
          caption="Captured from the public preview · 5 October 2026 · commands run in your local clone"
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <Capability
            icon={<Terminal className="size-4" />}
            title="A real CLI"
            text="Human prompts or stable JSON. Inspect types, run reads and prepare unsigned transactions."
            href="/docs/cli"
            link="CLI commands"
          />
          <Capability
            icon={<Braces className="size-4" />}
            title="Optional contract chat"
            text="Configure OpenAI, Anthropic or Gemini locally. Tool results render as fixed cards; forms also work without a model key."
            href="/docs/configuration#enable-the-assistant"
            link="Configure chat"
          />
          <Capability
            icon={<ShieldCheck className="size-4" />}
            title="Approval stays with you"
            text="CLI, MCP and chat can prepare. The local browser reviews the exact transaction, then your wallet approves submission."
            href="/docs/architecture#prepare-review-and-recover-a-write"
            link="Transaction workflow"
          />
        </div>
      </section>
    </>
  );
}

function ProductScreen({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="mt-8">
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl border border-border bg-card"
        aria-label={`Open full screenshot: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={1280}
          height={720}
          className="h-auto w-full"
          unoptimized
        />
      </a>
      <figcaption className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

function Capability({
  icon,
  title,
  text,
  href,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  link: string;
}) {
  return (
    <div className="border-t border-border pt-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{text}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-xs font-medium hover:text-primary"
      >
        {link}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
