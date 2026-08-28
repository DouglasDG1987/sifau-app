import { redirect } from "next/navigation";
import AuthScreen from "@/screens/auth/AuthScreen";
import { getSessionProfile } from "@/lib/auth";
import { roleHome } from "@/lib/auth";

export default async function AuthPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(roleHome(profile.role));
  return <AuthScreen />;
}
