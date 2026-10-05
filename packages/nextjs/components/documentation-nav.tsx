"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DocumentationNav({
  documents,
}: {
  documents: { slug: string; title: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Documentation"
      className="flex gap-2 overflow-x-auto pb-3 lg:sticky lg:top-8 lg:flex-col lg:overflow-visible"
    >
      {documents.map((doc) => {
        const href = `/docs/${doc.slug}`;
        const current = pathname === href;
        return (
          <Link
            key={doc.slug}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${current ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {doc.title}
          </Link>
        );
      })}
    </nav>
  );
}
