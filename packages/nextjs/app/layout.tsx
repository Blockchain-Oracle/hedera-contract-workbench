import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@scaffold-hbar-ui/components/styles.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Contract Workbench · Hedera",
  description:
    "One typed interface for deployed Hedera EVM contracts. Browser, CLI, MCP, and AI agents.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
