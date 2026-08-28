import { requireProfile } from "@/lib/auth";
import CreateOS from "@/screens/gestor/CreateOS";

export const metadata = { title: "Nova Ordem de Serviço" };

export default async function NovaOSPage({
  searchParams,
}: {
  searchParams: Promise<{ denuncia_id?: string }>;
}) {
  const profile = await requireProfile(["gestor"]);
  const sp = await searchParams;
  return <CreateOS profile={profile} denunciaId={sp.denuncia_id ?? null} />;
}
