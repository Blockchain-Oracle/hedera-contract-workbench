import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
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
          <nav
            aria-label="Documentation"
            className="flex gap-2 overflow-x-auto pb-3 lg:sticky lg:top-8 lg:flex-col lg:overflow-visible"
          >
            {documents.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="shrink-0 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {doc.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 max-w-[820px]">{children}</main>
      </div>
    </div>
  );
}
