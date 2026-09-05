import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuditLogs } from "@/lib/actions/portal";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await getAuditLogs(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Record of all data access and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Timestamp</th>
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Entity</th>
                    <th className="pb-2 font-medium">Patient Name</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const profile = (log as AuditLog & { profiles?: { full_name: string } | null }).profiles;
                    return (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-2 pr-4">{profile?.full_name ?? "Unknown"}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline">{log.action}</Badge>
                        </td>
                        <td className="py-2 pr-4">{log.entity}</td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">
                          {log.entity_id.slice(0, 8)}…
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
