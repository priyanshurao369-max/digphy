import { redirect } from "next/navigation";

/**
 * Login is disabled in demo mode. The role selector at "/" replaces it.
 */
export default function LoginPage() {
  redirect("/");
}
