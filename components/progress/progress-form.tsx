"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProgressEntry } from "@/lib/actions/encounters";
import { METRIC_PRESETS } from "@/lib/validators/schemas";

interface ProgressFormProps {
  patientId: string;
  clinicianId: string;
}

export function ProgressForm({ patientId, clinicianId }: ProgressFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [metricKey, setMetricKey] = useState<string>(METRIC_PRESETS[0].key);

  const preset = METRIC_PRESETS.find((m) => m.key === metricKey) ?? METRIC_PRESETS[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const result = await createProgressEntry({
      patient_id: patientId,
      date_time: new Date(form.get("date_time") as string).toISOString(),
      metric_key: metricKey,
      value: Number(form.get("value")),
      unit: preset.unit,
      source: "clinic",
      clinician_id: clinicianId,
      notes: (form.get("notes") as string) || undefined,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    (e.target as HTMLFormElement).reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Progress Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <Label>Metric</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_PRESETS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="value">Value ({preset.unit})</Label>
            <Input id="value" name="value" type="number" step="0.1" required />
          </div>
          <div>
            <Label htmlFor="date_time">Date & Time</Label>
            <Input
              id="date_time"
              name="date_time"
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
