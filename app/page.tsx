import Link from "next/link";
import {
  Activity, Stethoscope, UserRound, ClipboardList, TrendingUp,
  FileLock2, ScrollText, Heart, Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RoleSelectPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Activity className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">DigPhy</h1>
        <p className="text-muted-foreground">
          Physiotherapy Assessment &amp; Patient Tracking — demo mode
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>I&apos;m a Therapist</CardTitle>
            <CardDescription>
              Patient registry, SOAP encounters, progress charts, documents &amp; audit logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Manage patients &amp; demographics</p>
            <p className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> 5-step SOAP encounter wizard</p>
            <p className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Multi-metric progress charts</p>
            <p className="flex items-center gap-2"><FileLock2 className="h-4 w-4" /> Secure document upload</p>
            <p className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Compliance audit log</p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Enter Clinician Workspace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <UserRound className="h-6 w-6 text-emerald-700" />
            </div>
            <CardTitle>I&apos;m a Patient</CardTitle>
            <CardDescription>
              Your personal recovery summary — read-only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Heart className="h-4 w-4" /> Current pain score</p>
            <p className="flex items-center gap-2"><Activity className="h-4 w-4" /> Pain trend chart</p>
            <p className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Home exercise program</p>
            <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Next appointment</p>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/my-summary">View My Summary</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 max-w-md text-center text-xs text-muted-foreground">
        Demo build — all data is sample data held in memory. Changes you make
        persist for this browser session and reset when the server restarts.
      </p>
    </div>
  );
}
