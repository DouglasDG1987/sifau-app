import { redirect } from "next/navigation";
import { getSessionProfile, roleHome } from "@/lib/auth";

export default async function AppHomePage() {
  const profile = await getSessionProfile();
  redirect(profile ? roleHome(profile.role) : "/auth");
}
