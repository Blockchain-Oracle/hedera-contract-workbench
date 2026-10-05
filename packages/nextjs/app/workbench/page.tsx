import { Workbench } from "@/components/workbench";
import { isHostedDemo } from "@/lib/hosting";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Workbench hostedDemo={isHostedDemo()} />;
}
