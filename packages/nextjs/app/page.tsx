import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { isHostedDemo } from "@/lib/hosting";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (typeof params.plan === "string")
    redirect(`/workbench?plan=${encodeURIComponent(params.plan)}`);
  return (
    <Landing
      hostedDemo={isHostedDemo()}
      initialContract={
        typeof params.contract === "string" ? params.contract : undefined
      }
    />
  );
}
