import { redirect } from "next/navigation";
import { Activity, Calendar, Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { getPatientSummary } from "@/lib/actions/portal";
import { signOut } from "@/lib/actions/patients";
import { formatDate } from "@/lib/utils";

export default async function MySummaryPage() {
  const summary = await getPatientSummary();
  if (!summary) redirect("/login");

  const { patient, painHistory, latestPain, homeProgram, nextFollowUp } = summary;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Activity className="h-5 w-5" />
            DigPhy — My Summary
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {patient?.first_name} {patient?.last_name}
          </h1>
          <p className="text-muted-foreground">Your physiotherapy progress summary</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-primary" />
                Current Pain Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestPain !== null ? (
                <p className="text-4xl font-bold text-primary">
                  {latestPain}
                  <span className="text-lg font-normal text-muted-foreground"> / 10</span>
                </p>
              ) : (
                <p className="text-muted-foreground">No pain score recorded yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextFollowUp ? (
                <p className="text-2xl font-bold">{formatDate(nextFollowUp)}</p>
              ) : (
                <p className="text-muted-foreground">Not scheduled yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pain Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart data={painHistory} label="Pain VAS" unit="score" height={220} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Home Exercise Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{homeProgram}</p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This portal shows summary information only. Contact your physiotherapist for full records.
        </p>
      </main>
    </div>
  );
}
