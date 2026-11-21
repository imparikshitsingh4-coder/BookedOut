import Link from "next/link";

import { signInAction } from "@/lib/auth/actions";
import { AuthShell } from "@/components/auth-shell";
import { ErrorNotice, Field, Notice } from "@/components/form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to BookedOut."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {message === "signed-out" && <Notice>You have been signed out.</Notice>}
      {message === "password-updated" && <Notice>Password updated. Sign in with your new password.</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Sign in
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}
