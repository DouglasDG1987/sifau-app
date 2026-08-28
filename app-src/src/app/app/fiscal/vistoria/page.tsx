import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import FieldInspection from "@/screens/fiscal/FieldInspection";
import { ScreenLoader } from "@/components/empty-state";

export const metadata = { title: "Vistoria em campo" };

export default async function VistoriaPage() {
  const profile = await requireProfile(["fiscal"]);
  return (
    <Suspense fallback={<ScreenLoader label="Preparando vistoria…" />}>
      <FieldInspection profile={profile} />
    </Suspense>
  );
}
