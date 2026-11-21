import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { updatePasswordAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { ErrorNotice, Field } from "@/components/form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A recovery link lands here with a session already established. Without one
  // there is nothing to reset, so send the visitor back to request a new link.
  if (!user) redirect("/forgot-password?error=" + encodeURIComponent("Open the reset link from your email first."));

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Signed in as ${user.email ?? "your account"}.`}
      footer={
        <Link href="/dashboard" className="font-semibold text-brand-600 hover:underline">
          Skip for now
        </Link>
      }
    >
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form action={updatePasswordAction} className="space-y-4">
        <Field label="New password" name="password" type="password" autoComplete="new-password" required />
        <Field label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" required />
        <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
