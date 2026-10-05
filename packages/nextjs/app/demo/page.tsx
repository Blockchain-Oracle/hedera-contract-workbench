import { PublicHeader } from "@/components/public-header";
import { Demo } from "@/components/demo";
export const metadata = { title: "Live demo · Contract Workbench" };
export default function Page() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
        <Demo />
      </main>
    </div>
  );
}
