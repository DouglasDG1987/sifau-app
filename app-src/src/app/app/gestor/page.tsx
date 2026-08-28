import { requireProfile } from "@/lib/auth";
import GestorDashboard from "@/screens/gestor/GestorDashboard";

export const metadata = { title: "Dashboard municipal" };

export default async function GestorPage() {
  const profile = await requireProfile(["gestor"]);
  return <GestorDashboard profile={profile} />;
}
