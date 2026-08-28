import { requireProfile } from "@/lib/auth";
import FiscalHome from "@/screens/fiscal/FiscalHome";

export const metadata = { title: "Painel do fiscal" };

export default async function FiscalPage() {
  const profile = await requireProfile(["fiscal"]);
  return <FiscalHome profile={profile} />;
}
