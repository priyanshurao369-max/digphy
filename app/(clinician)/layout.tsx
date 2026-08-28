import { redirect } from "next/navigation";
import { ClinicianNav } from "@/components/layout/clinician-nav";
import { createClient } from "@/lib/supabase/server";

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role === "Patient") redirect("/my-summary");

  return (
    <div className="min-h-screen bg-background">
      <ClinicianNav userName={profile?.full_name ?? user.email ?? "Clinician"} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
