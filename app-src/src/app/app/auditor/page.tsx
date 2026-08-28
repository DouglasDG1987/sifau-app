import { requireProfile } from "@/lib/auth";
import AuditorPanel from "@/screens/auditor/AuditorPanel";

export const metadata = { title: "Auditoria" };

export default async function AuditorPage() {
  const profile = await requireProfile(["auditor"]);
  return <AuditorPanel profile={profile} />;
}
