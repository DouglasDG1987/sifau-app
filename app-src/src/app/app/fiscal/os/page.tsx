import { requireProfile } from "@/lib/auth";
import FiscalOSList from "@/screens/fiscal/FiscalOSList";

export const metadata = { title: "Ordens de Serviço" };

export default async function FiscalOSPage() {
  const profile = await requireProfile(["fiscal"]);
  return <FiscalOSList profile={profile} />;
}
