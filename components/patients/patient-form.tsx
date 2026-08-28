"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPatient, updatePatient } from "@/lib/actions/patients";
import type { Patient } from "@/types";

interface PatientFormProps {
  patient?: Patient;
}

export function PatientForm({ patient }: PatientFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consentSigned, setConsentSigned] = useState(patient?.consent_signed ?? false);
  const [sex, setSex] = useState(patient?.sex ?? "Male");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      date_of_birth: form.get("date_of_birth") as string,
      sex: sex as "Male" | "Female" | "Other",
      contact_phone: form.get("contact_phone") as string,
      email: form.get("email") as string,
      address: form.get("address") as string,
      primary_diagnosis: form.get("primary_diagnosis") as string,
      comorbidities: (form.get("comorbidities") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      current_medications: (form.get("current_medications") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: (form.get("allergies") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      mobility_aids: (form.get("mobility_aids") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      consent_signed: consentSigned,
      consent_date: consentSigned ? (form.get("consent_date") as string) || null : null,
      emergency_contact: form.get("ec_name")
        ? {
            name: form.get("ec_name") as string,
            phone: form.get("ec_phone") as string,
            relationship: form.get("ec_relationship") as string,
          }
        : null,
      caregiver: form.get("cg_name")
        ? {
            name: form.get("cg_name") as string,
            phone: form.get("cg_phone") as string,
            relationship: form.get("cg_relationship") as string,
          }
        : null,
    };

    const result = patient
      ? await updatePatient(patient.id, payload)
      : await createPatient(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(`/patients/${result.data!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" name="first_name" defaultValue={patient?.first_name} required />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" name="last_name" defaultValue={patient?.last_name} required />
          </div>
          <div>
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={patient?.date_of_birth}
              required
            />
          </div>
          <div>
            <Label>Sex *</Label>
            <Select value={sex} onValueChange={(v) => setSex(v as typeof sex)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="contact_phone">Phone (+91-XXXXXXXXXX) *</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              placeholder="+91-9876543210"
              defaultValue={patient?.contact_phone}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={patient?.email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" defaultValue={patient?.address ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clinical Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="primary_diagnosis">Primary Diagnosis *</Label>
            <Input
              id="primary_diagnosis"
              name="primary_diagnosis"
              defaultValue={patient?.primary_diagnosis}
              required
            />
          </div>
          <div>
            <Label htmlFor="comorbidities">Comorbidities (comma-separated)</Label>
            <Input
              id="comorbidities"
              name="comorbidities"
              defaultValue={patient?.comorbidities?.join(", ")}
            />
          </div>
          <div>
            <Label htmlFor="allergies">Allergies (comma-separated)</Label>
            <Input id="allergies" name="allergies" defaultValue={patient?.allergies?.join(", ")} />
          </div>
          <div>
            <Label htmlFor="current_medications">Current Medications</Label>
            <Input
              id="current_medications"
              name="current_medications"
              defaultValue={patient?.current_medications?.join(", ")}
            />
          </div>
          <div>
            <Label htmlFor="mobility_aids">Mobility Aids</Label>
            <Input
              id="mobility_aids"
              name="mobility_aids"
              defaultValue={patient?.mobility_aids?.join(", ")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="consent_signed"
              checked={consentSigned}
              onCheckedChange={(c) => setConsentSigned(c === true)}
            />
            <Label htmlFor="consent_signed">Consent signed for treatment *</Label>
          </div>
          {consentSigned && (
            <div>
              <Label htmlFor="consent_date">Consent Date</Label>
              <Input
                id="consent_date"
                name="consent_date"
                type="date"
                defaultValue={patient?.consent_date ?? new Date().toISOString().split("T")[0]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : patient ? "Update Patient" : "Create Patient"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
