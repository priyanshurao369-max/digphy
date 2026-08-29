import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
      <h1 className="text-4xl font-bold tracking-tight text-primary">404 — Not Found</h1>
      <p className="text-muted-foreground max-w-md">
        The patient record or clinical resource you are looking for could not be found or has been moved.
      </p>
      <div className="flex gap-3 pt-2">
        <Button asChild variant="default">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/patients">View Patients</Link>
        </Button>
      </div>
    </div>
  );
}
