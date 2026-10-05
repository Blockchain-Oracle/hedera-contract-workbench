"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, ArrowUpRight } from "lucide-react";
import { WorkbenchMark } from "./identity";
import { Button } from "./ui/button";

export function PublicHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-18 max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-tight"
        >
          <WorkbenchMark className="size-7 shrink-0" />
          <span>
            Contract
            <br className="sm:hidden" /> Workbench
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-3 text-xs sm:gap-6"
        >
          <Link href="/docs" className="hover:text-primary">
            Docs
          </Link>
          <Link href="/demo" className="hover:text-primary">
            Demo
          </Link>
          <a
            href="https://github.com/Blockchain-Oracle/hedera-contract-workbench"
            className="hidden text-muted-foreground hover:text-foreground md:block"
          >
            GitHub
          </a>
          <button
            aria-label="Toggle light and dark theme"
            className="grid size-9 place-items-center rounded-lg hover:bg-muted"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </button>
          <Button
            size="sm"
            variant="secondary"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/workbench">
              Open app <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
