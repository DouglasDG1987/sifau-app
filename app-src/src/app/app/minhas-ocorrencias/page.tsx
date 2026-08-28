import { requireProfile } from "@/lib/auth";
import CitizenHome from "@/screens/citizen/CitizenHome";

export const metadata = { title: "Minhas ocorrências" };

export default async function MinhasOcorrenciasPage() {
  const profile = await requireProfile(["cidadao"]);
  return <CitizenHome profile={profile} />;
}
