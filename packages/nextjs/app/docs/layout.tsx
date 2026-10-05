import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { DocumentationNav } from "@/components/documentation-nav";
import { documents } from "@/lib/documentation";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <aside className="min-w-0">
          <Link href="/docs" className="mb-4 block text-sm font-semibold">
            Documentation
          </Link>
          <DocumentationNav
            documents={documents.map(({ slug, title }) => ({ slug, title }))}
          />
        </aside>
        <main className="min-w-0 max-w-[820px]">
          {children}
          <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/Blockchain-Oracle/hedera-contract-workbench"
              className="hover:text-foreground"
            >
              Source on GitHub
            </a>
            <Link href="/docs/quickstart" className="hover:text-foreground">
              Run locally
            </Link>
            <Link href="/docs/support" className="hover:text-foreground">
              Availability and limits
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
