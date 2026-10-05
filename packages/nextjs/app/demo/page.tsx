import { PublicHeader } from "@/components/public-header";
import { Demo } from "@/components/demo";
import { DemoVideo } from "@/components/demo-video";
import { DemoWalkthrough } from "@/components/demo-walkthrough";
import { demoVideo } from "@/lib/demo-video";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "Demo & walkthrough · Contract Workbench",
  description:
    "See the contract workspace, CLI and agent workflow, try a real Hedera testnet read, and inspect verification evidence.",
};
export default function Page() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-8 sm:py-16">
        <section aria-labelledby="demo-title">
          <p className="text-xs text-muted-foreground">
            Contract Workbench / Demo
          </p>
          <h1
            id="demo-title"
            className="mt-5 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-6xl"
          >
            One contract.
            <br />
            See what you can do.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            An address and ABI become a workspace, CLI commands and tools for
            your agent. Explore the product, then run a real Hedera testnet
            read.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#try-it">
                Try a live read{" "}
                <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/quickstart">
                Run it locally{" "}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div id="video" className="mt-10 scroll-mt-6">
            <DemoVideo
              video={demoVideo(process.env.WORKBENCH_DEMO_YOUTUBE_URL)}
            />
          </div>
        </section>
        <nav
          aria-label="Demo sections"
          className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-b border-border pb-6 text-xs text-muted-foreground"
        >
          <a href="#walkthrough" className="hover:text-foreground">
            01 / The workspace
          </a>
          <a href="#agents" className="hover:text-foreground">
            02 / Your agent
          </a>
          <a href="#try-it" className="hover:text-foreground">
            03 / Try it live
          </a>
          <a href="#evidence" className="hover:text-foreground">
            04 / Verification
          </a>
        </nav>
        <DemoWalkthrough />
        <section
          id="try-it"
          aria-labelledby="try-title"
          className="scroll-mt-6 border-t border-border py-12 sm:py-16"
        >
          <Demo />
        </section>
        <section
          id="evidence"
          aria-labelledby="evidence-title"
          className="scroll-mt-6 border-t border-border py-12 sm:py-16"
        >
          <p className="text-xs text-muted-foreground">04 / Verification</p>
          <h2
            id="evidence-title"
            className="mt-4 text-3xl font-medium tracking-tight"
          >
            Follow the evidence.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Read results, adapter checks and build records are linked below. A
            read or unsigned simulation is separate from a wallet-approved
            transaction.
          </p>
          <div className="mt-8 divide-y divide-border border-y border-border">
            <EvidenceRow
              title="Real Hedera reads"
              status="Verified"
              detail="Recorded testnet and mainnet factory() responses, including the public preview."
              href="https://github.com/Blockchain-Oracle/hedera-contract-workbench/blob/main/docs/evidence/public-preview/checks.json"
            />
            <EvidenceRow
              title="CLI & MCP agreement"
              status="Verified"
              detail="Actual CLI subprocess and local adapter checks against the shared execution core."
              href="https://github.com/Blockchain-Oracle/hedera-contract-workbench/blob/main/docs/evidence/local-adapters.json"
            />
            <EvidenceRow
              title="Fresh template installation"
              status="Verified"
              detail="Public scaffold download, ordinary installation, lint, typecheck, build and boot evidence."
              href="/docs/submission"
            />
            <EvidenceRow
              title="Funded wallet transaction"
              status="Pending"
              detail="A human-controlled Hedera testnet transaction and explorer receipt remain outstanding."
              href="/docs/submission"
            />
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Evidence records are dated snapshots. The live demo makes a new RPC
            request only when you run a function.
          </p>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8 text-sm">
          <p className="font-medium">Bring your own contract.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/docs/quickstart" className="hover:text-primary">
              Get the template ↗
            </Link>
            <Link href="/docs" className="hover:text-primary">
              Documentation ↗
            </Link>
            <a
              href="https://github.com/Blockchain-Oracle/hedera-contract-workbench"
              className="hover:text-primary"
            >
              Source ↗
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function EvidenceRow({
  title,
  status,
  detail,
  href,
}: {
  title: string;
  status: "Verified" | "Pending";
  detail: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group grid gap-3 py-5 sm:grid-cols-[180px_minmax(0,1fr)_100px] sm:gap-6"
    >
      <span className="font-medium text-sm group-hover:text-primary">
        {title}
      </span>
      <span className="text-xs leading-6 text-muted-foreground">{detail}</span>
      <span className="inline-flex items-center gap-2 text-xs sm:justify-end">
        <span
          className={
            status === "Verified"
              ? "size-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400"
              : "size-1.5 rounded-full bg-muted-foreground"
          }
        />
        {status}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}
