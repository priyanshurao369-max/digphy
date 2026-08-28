import { ClinicianNav } from "@/components/layout/clinician-nav";
import { getCurrentProfile } from "@/lib/actions/portal";

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo mode: no auth. Use the static demo clinician profile.
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-background">
      <ClinicianNav userName={profile?.full_name ?? "Dr. Ananya Sharma"} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
