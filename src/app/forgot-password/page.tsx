import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { ErrorNotice, Field, Notice } from "@/components/form";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {message === "check-email" && (
        <Notice>If that address has an account, a reset link is on its way. Locally it arrives at http://localhost:54324.</Notice>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form action={requestPasswordResetAction} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
