import { requireProfile } from "@/lib/auth";
import NewOccurrence from "@/screens/citizen/NewOccurrence";

export const metadata = { title: "Nova ocorrência" };

export default async function NovaOcorrenciaPage() {
  const profile = await requireProfile(["cidadao"]);
  return <NewOccurrence profile={profile} />;
}
