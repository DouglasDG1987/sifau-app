import { requireProfile } from "@/lib/auth";
import GestorOSList from "@/screens/gestor/GestorOSList";

export const metadata = { title: "Ordens de Serviço" };

export default async function GestorOSPage() {
  const profile = await requireProfile(["gestor"]);
  return <GestorOSList profile={profile} />;
}
