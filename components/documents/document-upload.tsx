"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadDocument } from "@/lib/actions/documents";
import type { Document } from "@/types";

const DOCS_KEY = (patientId: string) => `digphy_docs_${patientId}`;

function readLocal(patientId: string): Document[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DOCS_KEY(patientId));
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(patientId: string, docs: Document[]) {
  try {
    window.localStorage.setItem(DOCS_KEY(patientId), JSON.stringify(docs));
  } catch {
    // Storage may be full (large files) — fall back to server-only. Not fatal.
  }
}

interface DocumentUploadProps {
  patientId: string;
}

export function DocumentUpload({ patientId }: DocumentUploadProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("Consent");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("patient_id", patientId);
    formData.set("type", docType);
    formData.set("link_consent", docType === "Consent" ? "true" : "false");

    const result = await uploadDocument(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      // Persist to localStorage so the uploaded file survives the in-memory
      // store resetting across Vercel serverless instances.
      const existing = readLocal(patientId).filter((d) => d.id !== result.data!.id);
      saveLocal(patientId, [...existing, result.data!]);
    }

    router.refresh();
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div>
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Consent", "Report", "Image", "Prescription"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
