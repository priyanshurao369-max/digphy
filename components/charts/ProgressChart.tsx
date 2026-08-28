"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateTime } from "@/lib/utils";

interface ProgressChartProps {
  data: { date_time: string; value: number }[];
  label?: string;
  unit?: string;
  height?: number;
}

export function ProgressChart({
  data,
  label = "Progress",
  unit = "",
  height = 280,
}: ProgressChartProps) {
  const chartData = data.map((d) => ({
    date: formatDateTime(d.date_time),
    value: Number(d.value),
  }));

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        No progress data yet
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [`${value} ${unit}`, label]}
            labelStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
