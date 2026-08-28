"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  useEffect(() => {
    fetch(`/api/patients?q=${q}`)
      .then(r => r.json())
      .then(setPatients)
      .finally(() => setLoading(false));
  }, [q]);

  const handlePrint = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(buildPrintContent(p)); w.document.close(); w.focus(); w.print(); }
  };

  if (loading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">Loading...</h1></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">{patients.length} registered patients</p>
        </div>
        <Button asChild>
          <Link href="/patients/new"><Plus className="h-4 w-4" /> New Patient</Link>
        </Button>
      </div>

      <form method="get" className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search by name, phone, diagnosis..." className="pl-9" />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <div key={patient.id} className="relative">
            <Link href={`/patients/${patient.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{patient.first_name} {patient.last_name}</CardTitle>
                    <Badge variant={patient.consent_signed ? "success" : "warning"}>
                      {patient.consent_signed ? "Consent ✓" : "No consent"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{patient.primary_diagnosis}</p>
                  <p>{patient.contact_phone}</p>
                  <p>DOB: {formatDate(patient.date_of_birth)}</p>
                </CardContent>
              </Card>
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={(e) => handlePrint(patient, e)} className="absolute top-2 right-2 z-10 h-7 px-2">
              <Printer className="h-3.5 w-3.5 mr-1" />Print
            </Button>
          </div>
        ))}
      </div>

      {patients.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No patients found. <Link href="/patients/new" className="text-primary underline">Add your first patient</Link>
        </CardContent></Card>
      )}
    </div>
  );
}

function buildPrintContent(p: Patient): string {
  const s: string[] = [];
  s.push("<h2>Basic Info</h2><p>DOB: " + formatDate(p.date_of_birth) + "</p><p>Sex: " + p.sex + "</p><p>Phone: " + p.contact_phone + "</p>");
  if (p.email) s.push("<p>Email: " + p.email + "</p>");
  if (p.address) s.push("<p>Address: " + p.address + "</p>");
  if (p.primary_diagnosis) s.push("<p>Diagnosis: " + p.primary_diagnosis + "</p>");
  if (p.emergency_contact) s.push("<h2>Emergency Contact</h2><p>Name: " + p.emergency_contact.name + "</p><p>Phone: " + p.emergency_contact.phone + "</p><p>Rel: " + p.emergency_contact.relationship + "</p>");
  if (p.caregiver) s.push("<h2>Caregiver</h2><p>Name: " + p.caregiver.name + "</p><p>Phone: " + p.caregiver.phone + "</p><p>Rel: " + p.caregiver.relationship + "</p>");
  if (p.comorbidities?.length) s.push("<h2>Comorbidities</h2><ul>" + p.comorbidities.map(c => "<li>" + c + "</li>").join("") + "</ul>");
  const cc = p.consent_signed ? "signed" : "pending";
  const ct = p.consent_signed ? "Consent ✓ Signed" : "No consent";
  s.push("<h2>Consent</h2><span class=\"badge " + cc + "\">" + ct + "</span>");
  const html = "<html><head><title>" + p.first_name + " " + p.last_name + "</title><style>body{font-family:sans-serif;padding:20px}.print-section{margin-bottom:24px}.print-section h2{font-size:18px;font-weight:600;border-bottom:1px solid #eee;padding-bottom:8px}.label{color:#555}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px}.signed{background:#e6f4ea;color:#166534}.pending{background:#fef3c7;color:#92400e}</style></head><body><h1>" + p.first_name + " " + p.last_name + "</h1><div class=\"print-section\">" + s.join("") + "</div><p style=\"color:#666;font-size:12px\">Generated: " + new Date().toLocaleString("en-IN") + "</p></body></html>";
  return html;
}
