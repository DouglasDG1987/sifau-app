import { requireProfile } from "@/lib/auth";
import FiscalOSDetail from "@/screens/fiscal/FiscalOSDetail";

export const metadata = { title: "Detalhe da OS" };

export default async function FiscalOSDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile(["fiscal"]);
  const { id } = await params;
  return <FiscalOSDetail profile={profile} id={id} />;
}
