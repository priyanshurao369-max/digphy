"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown, Home, Calendar } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const painData = [
    { date: "Aug 7", pain: 7 },
    { date: "Aug 14", pain: 5 },
    { date: "Aug 21", pain: 3 },
];

export default function PatientDemoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
            {/* Header */}
            <header className="border-b bg-white shadow-sm">
                <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">My Health Summary</h1>
                            <p className="text-sm text-muted-foreground">Rajesh Kumar - Demo Patient</p>
                        </div>
                        <Link href="/login">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Demo Banner */}
                <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800">
                        ℹ️ <strong>Demo Mode:</strong> This is a preview of the patient portal. Log in with your credentials to view your actual health data.
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                    {/* Current Pain Score */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Current Pain Level</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-green-600">3/10</div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                ✅ Improving - down from 7/10 three weeks ago
                            </p>
                            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                                <div className="h-2 w-3/12 rounded-full bg-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Appointment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                Next Appointment
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Sept 4</div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Wednesday, 10:00 AM at DigPhy Clinic
                            </p>
                            <Badge className="mt-3" variant="secondary">Confirmed</Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Branch Progress Analytics Dashboard */}
                <div className="mb-8">
                    <BranchProgressDashboard
                        patient={demoPatient}
                        progressEntries={demoEntries}
                        isPatientView={true}
                    />
                </div>

                {/* Home Program */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="h-5 w-5 text-blue-600" />
                            Your Home Program
                        </CardTitle>
                        <CardDescription>Daily exercises to continue your recovery</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" defaultChecked />
                                <div>
                                    <p className="font-medium text-sm">Bird-Dog Exercise</p>
                                    <p className="text-xs text-muted-foreground">3 sets × 10 reps each side</p>
                                    <p className="text-xs text-muted-foreground">Strengthens core stability</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" defaultChecked />
                                <div>
                                    <p className="font-medium text-sm">Plank Hold</p>
                                    <p className="text-xs text-muted-foreground">3 sets × 20-30 seconds</p>
                                    <p className="text-xs text-muted-foreground">Build endurance and posture</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <p className="font-medium text-sm">Walking</p>
                                    <p className="text-xs text-muted-foreground">20-30 minutes daily</p>
                                    <p className="text-xs text-muted-foreground">Maintain cardiovascular fitness</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Treatment Plan Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Treatment Plan</CardTitle>
                        <CardDescription>Overview of your ongoing physiotherapy</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="font-medium text-sm">Diagnosis</p>
                            <p className="text-sm text-muted-foreground">Lumbar disc herniation L4-L5 with nerve root irritation</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-sm">Treatment Duration</p>
                            <p className="text-sm text-muted-foreground">6 weeks (3 sessions per week)</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-sm">Progress</p>
                            <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                                <div className="h-2 w-1/2 rounded-full bg-blue-500" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Week 3 of 6 - On track</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-sm">Clinician</p>
                            <p className="text-sm text-muted-foreground">Dr. Ananya Sharma, DPT</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Features Info */}
                <Card className="mt-8 border-2 border-cyan-200 bg-cyan-50">
                    <CardHeader>
                        <CardTitle className="text-base">Patient Portal Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>✅ Real-time pain and progress tracking</p>
                        <p>✅ View SOAP encounter notes from your clinician</p>
                        <p>✅ Track home program exercises</p>
                        <p>✅ Schedule and manage appointments</p>
                        <p>✅ Download medical documents</p>
                        <p>✅ Secure patient-clinician messaging</p>
                        <p>✅ HIPAA-compliant data privacy</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
