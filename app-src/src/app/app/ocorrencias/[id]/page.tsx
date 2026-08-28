import { requireProfile } from "@/lib/auth";
import OccurrenceDetail from "@/screens/citizen/OccurrenceDetail";

export const metadata = { title: "Detalhe da ocorrência" };

export default async function OccurrenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile(["cidadao", "fiscal", "gestor", "auditor"]);
  const { id } = await params;
  return <OccurrenceDetail profile={profile} id={id} />;
}
