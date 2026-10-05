import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement, type ReactNode } from "react";
import { documentSource, documents, documentLink } from "@/lib/documentation";
import { CopyButton } from "@/components/result";
export const dynamic = "force-static";
export const dynamicParams = false;

function headingId(children: ReactNode): string {
  const text = Children.toArray(children)
    .map((child): string =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? headingId(child.props.children)
          : "",
    )
    .join("");
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function generateStaticParams() {
  return documents.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `${documents.find((doc) => doc.slug === slug)?.title ?? "Documentation"} · Contract Workbench`,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = documents.find((item) => item.slug === slug);
  if (!doc) notFound();
  const source = await documentSource(doc.file);
  return (
    <article className="wb-document">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 id={headingId(children)}>{children}</h1>,
          h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
          a: ({ href, children, ...props }) => (
            <a {...props} href={documentLink(doc.file, href ?? "")}>
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              <img src={documentLink(doc.file, src, true)} alt={alt ?? ""} />
            ) : null,
          pre: ({ children }) => {
            const child = Children.toArray(children)[0];
            const value = isValidElement<{ children?: ReactNode }>(child)
              ? String(child.props.children ?? "").replace(/\n$/, "")
              : "";
            return (
              <div className="wb-doc-code">
                <div className="flex justify-end px-3 pt-2">
                  <CopyButton value={value} label="Copy code" />
                </div>
                <pre>{children}</pre>
              </div>
            );
          },
          table: ({ children }) => (
            <div>
              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Scrollable documentation table"
                tabIndex={0}
              >
                <table>{children}</table>
              </div>
              <span className="block text-xs text-muted-foreground sm:hidden">
                Swipe to see all columns →
              </span>
            </div>
          ),
        }}
      >
        {source}
      </Markdown>
    </article>
  );
}
