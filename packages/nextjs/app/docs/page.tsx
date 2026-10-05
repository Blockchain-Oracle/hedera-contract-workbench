import Link from "next/link";
import { ArrowRight, Terminal, Braces, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Documentation · Contract Workbench" };
export default function Page() {
  return (
    <div className="space-y-10">
      <div>
        <p className="mb-4 text-xs text-muted-foreground">
          Contract Workbench / Documentation
        </p>
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
          One contract.
          <br />
          Every interface.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
          A local Scaffold HBAR template for deployed Hedera EVM contracts.
          Browser forms, CLI commands and agent tools share the same validated
          ABI catalog.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/docs/quickstart">
              Run locally <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/demo">Try a live read</Link>
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {[
          {
            title: "Start without keys",
            text: "Install the template and run a real testnet read. Bring another address and ABI when ready.",
            href: "/docs/quickstart",
            Icon: BookOpen,
          },
          {
            title: "Use your terminal",
            text: "Inspect schemas, construct typed arguments, call getters and prepare unsigned transactions.",
            href: "/docs/cli",
            Icon: Terminal,
          },
          {
            title: "Connect your agent",
            text: "Install the portable skill for your host, or use local MCP. The skill adapts to the current contract catalog.",
            href: "/docs/agents",
            Icon: Braces,
          },
        ].map(({ title, text, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 py-6"
          >
            <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <h2 className="text-base font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          </Link>
        ))}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Public preview: bundled reads and unsigned simulation. Imports, optional
        provider chat and browser wallet transactions run locally.{" "}
        <Link href="/docs/submission" className="underline underline-offset-4">
          View current release evidence and remaining acceptance work.
        </Link>
      </p>
    </div>
  );
}
