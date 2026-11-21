import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { signUpAction } from "@/lib/auth/actions";
import { ErrorNotice, Field, Notice } from "@/components/form";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with your own login, then add your business."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {message === "check-email" && (
        <Notice>
          Check your inbox for a confirmation link. Locally, the emails appear at{" "}
          <span className="font-medium">http://localhost:54324</span>.
        </Notice>
      )}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form action={signUpAction} className="space-y-4">
        <Field label="Full name" name="full_name" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Create account
        </button>
      </form>

      <p className="text-xs text-slate-500">Passwords must be at least 8 characters.</p>
    </AuthShell>
  );
}
