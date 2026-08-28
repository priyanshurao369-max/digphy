"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import type { Document } from "@/types";

interface DocumentLibraryProps {
  patientId: string;
  serverDocs: Document[];
}

const KEY = (patientId: string) => `digphy_docs_${patientId}`;

function readLocal(patientId: string): Document[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(patientId));
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
}

function isImage(doc: Document): boolean {
  const url = doc.storage_reference ?? "";
  if (url.startsWith("data:image")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i.test(doc.filename);
}

export function DocumentLibrary({ patientId, serverDocs }: DocumentLibraryProps) {
  const [localDocs, setLocalDocs] = useState<Document[]>([]);
  const [preview, setPreview] = useState<Document | null>(null);

  useEffect(() => {
    setLocalDocs(readLocal(patientId));
  }, [patientId]);

  const docs = useMemo(() => {
    const map = new Map<string, Document>();
    for (const d of serverDocs) map.set(d.id, d);
    for (const d of localDocs) map.set(d.id, d);
    return [...map.values()].sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
  }, [serverDocs, localDocs]);

  const openInViewer = (doc: Document) => {
    if (doc.storage_reference) {
      window.open(doc.storage_reference, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No documents uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const url = doc.storage_reference;
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-3 py-4">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        className="font-medium underline text-primary hover:text-primary/80"
                        onClick={() => openInViewer(doc)}
                        type="button"
                      >
                        {doc.filename}
                      </button>
                      <Badge variant="secondary">{doc.type}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      Uploaded {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreview(doc)}>
                      <Eye className="h-4 w-4" />
                      View
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
      )}

      <Dialog open={!!preview} onOpenChange={(open) => setPreview(open ? preview : null)}>
        {preview && preview.storage_reference && (
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="pr-8">{preview.filename}</DialogTitle>
              {preview.type && (
                <DialogDescription>Document type: {preview.type}</DialogDescription>
              )}
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 border p-3 rounded-md bg-muted">
                <Button onClick={() => openInViewer(preview)}>
                  Open in Viewer
                </Button>
                <Button asChild variant="outline">
                  <a href={preview.storage_reference} download={preview.filename}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
              {isImage(preview) ? (
                <img
                  src={preview.storage_reference}
                  alt={preview.filename}
                  className="mx-auto max-h-[70vh] max-w-full rounded"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Images render directly in the dialog. Click &quot;Open in Viewer&quot; for PDFs
                  and other file types.
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}