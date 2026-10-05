import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement, type ReactNode } from "react";
import { documentSource, documents, documentLink } from "@/lib/documentation";
import { CopyButton } from "@/components/result";
export const dynamic = "force-static";
export const dynamicParams = false;
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
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </Markdown>
    </article>
  );
}
