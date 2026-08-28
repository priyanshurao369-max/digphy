"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { Document } from "@/types";

interface DocumentLibraryProps {
  patientId: string;
  serverDocs: Document[];
}

const KEY = (patientId: string) => `digphy_docs_${patientId}`;

/**
 * Read documents persisted in the browser for this patient.
 * (The in-memory mock store resets across Vercel serverless instances, so we
 * cache uploaded files in localStorage so View/Download keep working.)
 */
function readLocal(patientId: string): Document[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(patientId));
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
}

export function DocumentLibrary({ patientId, serverDocs }: DocumentLibraryProps) {
  const [localDocs, setLocalDocs] = useState<Document[]>([]);

  useEffect(() => {
    setLocalDocs(readLocal(patientId));
  }, [patientId]);

  const docs = useMemo(() => {
    const map = new Map<string, Document>();
    for (const d of serverDocs) map.set(d.id, d);
    // Persisted local copies win so the most recent view always reflects uploads.
    for (const d of localDocs) map.set(d.id, d);
    return [...map.values()].sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
  }, [serverDocs, localDocs]);

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No documents uploaded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => {
        const url = doc.storage_reference;
        return (
          <Card key={doc.id}>
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{doc.filename}</p>
                  <Badge variant="secondary">{doc.type}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  Uploaded {formatDateTime(doc.uploaded_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    View
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={url} download={doc.filename}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}