"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, FileText, TrendingDown, Lock } from "lucide-react";
import Link from "next/link";

export default function ClinicianDemoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
            {/* Header */}
            <header className="border-b bg-white shadow-sm">
                <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">DigPhy Clinician Dashboard</h1>
                            <p className="text-sm text-muted-foreground">Demo Mode - Read Only</p>
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
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Demo Banner */}
                <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800">
                        ℹ️ <strong>Demo Mode:</strong> This is a preview of the clinician interface. Create an account to access real patient data.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">24</div>
                            <p className="text-xs text-muted-foreground mt-1">+2 this month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Encounters This Week</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">8</div>
                            <p className="text-xs text-muted-foreground mt-1">All completed</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Pain Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">4.2/10</div>
                            <p className="text-xs text-muted-foreground mt-1">Improving trend</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Follow-ups Due</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">3</div>
                            <p className="text-xs text-muted-foreground mt-1">This week</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Features Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Patients */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Patient Registry
                            </CardTitle>
                            <CardDescription>Manage patient demographics & medical history</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Rajesh Kumar</span>
                                    <Badge variant="secondary">Active</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Lumbar disc herniation | 3 encounters</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Priya Mehta</span>
                                <Badge variant="secondary">Active</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">ACL reconstruction rehab | 2 encounters</p>
                        </CardContent>
                    </Card>

                    {/* SOAP Encounters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-600" />
                                SOAP Encounters
                            </CardTitle>
                            <CardDescription>Document 5-step clinical assessments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <div className="text-sm">
                                    <p className="font-medium">Rajesh Kumar - Follow-up</p>
                                    <p className="text-xs text-muted-foreground">Aug 28, 2026</p>
                                </div>
                                <div className="rounded bg-slate-50 p-2 text-xs">
                                    <p><strong>S:</strong> Lower back pain, improved with exercises</p>
                                    <p><strong>O:</strong> ROM ↑, Pain VAS 5/10</p>
                                    <p><strong>A:</strong> Lumbar radiculopathy, improving</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Tracking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-purple-600" />
                                Progress Charts
                            </CardTitle>
                            <CardDescription>Track metrics over time with interactive graphs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Pain VAS (Rajesh)</span>
                                    <span className="font-bold">7 → 3</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200">
                                    <div className="h-2 w-3/12 rounded-full bg-green-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>ROM - Knee Flexion</span>
                                    <span className="font-bold">85° → 115°</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200">
                                    <div className="h-2 w-9/12 rounded-full bg-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Document Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-600" />
                                Secure Documents
                            </CardTitle>
                            <CardDescription>Upload & manage patient files with encryption</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">📄 Consent_Rajesh.pdf</p>
                            <p className="text-sm text-muted-foreground">📋 Assessment_Report_Priya.docx</p>
                            <p className="text-sm text-muted-foreground">📸 ROM_Images_Rajesh.zip</p>
                        </CardContent>
                    </Card>

                    {/* Audit Logging */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-red-600" />
                                Audit Logging
                            </CardTitle>
                            <CardDescription>Track all data access for HIPAA compliance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-muted-foreground">
                            <p>✓ 14:32 - Viewed Rajesh Kumar patient record</p>
                            <p>✓ 14:18 - Created encounter for Rajesh Kumar</p>
                            <p>✓ 13:45 - Downloaded Consent_Priya.pdf</p>
                            <p>✓ 13:22 - Updated Priya Mehta progress chart</p>
                        </CardContent>
                    </Card>

                    {/* Key Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Key Features</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>✅ Patient search & demographics</p>
                            <p>✅ 5-step SOAP encounter wizard</p>
                            <p>✅ Multi-metric progress tracking</p>
                            <p>✅ Secure document upload</p>
                            <p>✅ Compliance audit logs</p>
                            <p>✅ Role-based access control</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
