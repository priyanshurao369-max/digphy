"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { signIn } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>DigPhy</CardTitle>
          <CardDescription>Physiotherapy Assessment & Patient Tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="clinician">Guest Clinician</TabsTrigger>
              <TabsTrigger value="patient">Guest Patient</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="clinician@clinic.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Demo: clinician@digphy.demo / demo123456
              </p>
            </TabsContent>

            {/* Guest Clinician Tab */}
            <TabsContent value="clinician" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  View the clinician dashboard with mock patient data
                </p>
                <Button
                  onClick={() => router.push("/demo/clinician")}
                  className="w-full"
                  variant="default"
                >
                  Enter Clinician Demo
                </Button>
                <p className="text-xs text-muted-foreground">
                  💡 See: patient list, SOAP encounters, progress charts, audit logs
                </p>
              </div>
            </TabsContent>

            {/* Guest Patient Tab */}
            <TabsContent value="patient" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  View the patient portal with mock health data
                </p>
                <Button
                  onClick={() => router.push("/demo/patient")}
                  className="w-full"
                  variant="default"
                >
                  Enter Patient Demo
                </Button>
                <p className="text-xs text-muted-foreground">
                  💡 See: progress summary, pain trends, home program, next appointment
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
