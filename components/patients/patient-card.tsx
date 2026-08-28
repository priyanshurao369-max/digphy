"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";

export function PatientCard({ patient }: { patient: Patient }) {
  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      const html = buildPrintContent(patient);
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }
  };

  return (
    <div className="relative">
      <Link href={`/patients/${patient.id}`} className="block">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">
                {patient.first_name} {patient.last_name}
              </CardTitle>
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="absolute top-2 right-2 z-10 h-7 px-2"
      >
        <Printer className="h-3.5 w-3.5 mr-1" />
        Print
      </Button>
    </div>
  );
}

function buildPrintContent(p: Patient): string {
  const sections: string[] = [];
  sections.push(\`<h2>Basic Information</h2><p><strong>DOB:</strong> \${formatDate(p.date_of_birth)}</p><p><strong>Sex:</strong> \${p.sex}</p><p><strong>Phone:</strong> \${p.contact_phone}</p>\`);
  if (p.email) sections.push(\`<p><strong>Email:</strong> \${p.email}</p>\`);
  if (p.address) sections.push(\`<p><strong>Address:</strong> \${p.address}</p>\`);
  if (p.primary_diagnosis) sections.push(\`<p><strong>Diagnosis:</strong> \${p.primary_diagnosis}</p>\`);
  if (p.emergency_contact) sections.push(\`<h2>Emergency Contact</h2><p><strong>Name:</strong> \${p.emergency_contact.name}</p><p><strong>Phone:</strong> \${p.emergency_contact.phone}</p><p><strong>Relationship:</strong> \${p.emergency_contact.relationship}</p>\`);
  if (p.caregiver) sections.push(\`<h2>Caregiver</h2><p><strong>Name:</strong> \${p.caregiver.name}</p><p><strong>Phone:</strong> \${p.caregiver.phone}</p><p><strong>Relationship:</strong> \${p.caregiver.relationship}</p>\`);
  if (p.comorbidities?.length > 0) sections.push(\`<h2>Comorbidities</h2><ul>\${p.comorbidities.map(c => \`<li>\${c}</li>\`).join("")}</ul>\`);
  if (p.current_medications?.length > 0) sections.push(\`<h2>Current Medications</h2><ul>\${p.current_medications.map(m => \`<li>\${m}</li>\`).join("")}</ul>\`);
  if (p.allergies?.length > 0) sections.push(\`<h2>Allergies</h2><ul>\${p.allergies.map(a => \`<li>\${a}</li>\`).join("")}</ul>\`);
  if (p.mobility_aids?.length > 0) sections.push(\`<h2>Mobility Aids</h2><ul>\${p.mobility_aids.map(a => \`<li>\${a}</li>\`).join("")}</ul>\`);
  const consentClass = p.consent_signed ? "signed" : "pending";
  const consentText = p.consent_signed ? "Consent ✓ Signed" : "No consent";
  sections.push(\`<h2>Consent Status</h2><span class="consent-badge \${consentClass}">\${consentText}</span>\${p.consent_date ? \`<p><strong>Date:</strong> \${formatDate(p.consent_date)}</p>\` : ""}\`);
  const sectionHtml = sections.join("</div><div class='print-section'>");
  return \`<html><head><title>\${p.first_name} \${p.last_name}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:20px}.print-section{margin-bottom:24px}.print-section h2{font-size:18px;font-weight:600;margin:0 0 12px 0;border-bottom:1px solid #eee;padding-bottom:8px}.print-section p,.print-section ul{margin:4px 0}.label{font-weight:500;color:#555}.value{color:#111}.consent-badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:500}.consent-badge.signed{background:#e6f4ea;color:#166534}.consent-badge.pending{background:#fef3c7;color:#92400e}@media print{body{padding:0}}</style></head><body><h1>\${p.first_name} \${p.last_name}</h1><div class="print-section">\${sectionHtml}</div></body></html>\`;
}
