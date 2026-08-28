import { requireProfile } from "@/lib/auth";
import GestorOSDetail from "@/screens/gestor/GestorOSDetail";

export const metadata = { title: "Detalhe da OS" };

export default async function GestorOSDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile(["gestor"]);
  const { id } = await params;
  return <GestorOSDetail profile={profile} id={id} />;
}
