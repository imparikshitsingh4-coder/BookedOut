import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
        BookedOut
      </Link>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        </header>

        {children}
      </div>

      {footer && <div className="text-center text-sm text-slate-600">{footer}</div>}
    </main>
  );
}
