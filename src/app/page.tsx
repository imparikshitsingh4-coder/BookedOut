import Link from "next/link";

import { PLANS } from "@/lib/billing/plans";

const FEATURES = [
  {
    title: "Customer CRM",
    body: "Every customer, note, tag and last contact in one place. Search instantly, update in a click, and never lose the thread.",
    icon: "users",
  },
  {
    title: "Follow-ups that actually happen",
    body: "A daily queue of who to contact and why, with WhatsApp messages written for you. Nothing slips through.",
    icon: "clock",
  },
  {
    title: "Reviews on autopilot",
    body: "Request reviews, record ratings, reply to feedback and print a QR code that sends happy customers straight to your review page.",
    icon: "star",
  },
  {
    title: "Referrals & win-backs",
    body: "Give every customer a shareable code, track who converts, and bring quiet customers back with a ready-to-send message.",
    icon: "share",
  },
  {
    title: "Marketing toolkit",
    body: "Captions, hashtags, campaigns and a content calendar — generated from your own business details, no AI subscription needed.",
    icon: "megaphone",
  },
  {
    title: "Creative Studio",
    body: "Design posters with real text, colours, shapes and images. Save your brand kit and download print-ready PNGs.",
    icon: "palette",
  },
  {
    title: "Analytics that mean something",
    body: "Customer growth, pipeline mix, overdue follow-ups and review ratings — calculated from your real activity, not vanity metrics.",
    icon: "chart",
  },
  {
    title: "Built for teams",
    body: "Owner, admin and staff roles with database-enforced permissions. Your customer data is never visible to another business.",
    icon: "shield",
  },
];

const INDUSTRIES = [
  "Salons & barbers",
  "Spas & wellness",
  "Gyms & studios",
  "Tutors & coaches",
  "Photographers",
  "Clinics & dentists",
  "Restaurants & cafés",
  "Home services",
  "Freelancers",
  "Agencies",
  "Pet groomers",
  "Event planners",
];

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Starter plan is free and account creation takes under a minute. Billing is currently in test mode, so no card is requested and nothing is charged anywhere in the app.",
  },
  {
    q: "Is my customer data private?",
    a: "Yes. Every customer, follow-up, review, referral and design belongs to one business, and PostgreSQL Row Level Security enforces that in the database itself — not in the browser. Staff of another business cannot read your rows even if they guess an ID.",
  },
  {
    q: "Does BookedOut send WhatsApp messages for me?",
    a: "It prepares the message and opens WhatsApp with it filled in, so you always review and press send yourself. That keeps you compliant and avoids paid messaging APIs.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Every screen is built mobile-first: the dashboard, the customer list, follow-ups and the Creative Studio all work on a phone.",
  },
  {
    q: "Do I need design skills for the posters?",
    a: "No. Start from a template, then change the words, colours, shapes and images. Your brand kit keeps every poster consistent, and you export a PNG when it looks right.",
  },
  {
    q: "Which countries and currencies are supported?",
    a: "BookedOut is built for global use. Each business sets its own timezone and currency, and phone numbers are accepted in international format for WhatsApp links.",
  },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.87M16 4.13A4 4 0 0 1 16 11",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    star: "m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L3.6 9.8l6.5-.9z",
    share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
    megaphone: "m3 11 18-7v16L3 13zM7 12v8",
    palette: "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a6 6 0 0 0 0-10 9 9 0 0 0-3 0z",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    shield: "M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden>
      <path d={paths[name] ?? paths.users} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="currentColor" aria-hidden>
      <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0z" />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-black text-white shadow-sm">
        B
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">BookedOut</span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      <div className="bg-slate-900 px-4 py-2 text-center text-xs font-medium text-slate-200">
        BookedOut is in preview · start free, no card required · billing runs in test mode
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#industries" className="hover:text-slate-900">Industries</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary !px-3.5 !py-2 text-xs sm:text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-200/60 via-violet-200/50 to-amber-100/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                The customer growth OS for service businesses
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Run your business.
                <br />
                <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Not your spreadsheet.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Customers, follow-ups, reviews, referrals, marketing and beautiful posters — in one calm
                workspace built for salons, studios, clinics and every business that runs on repeat customers.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn-primary !px-6 !py-3 text-base">
                  Start free — no card
                </Link>
                <a href="#features" className="btn-secondary !px-6 !py-3 text-base">
                  See what&apos;s inside
                </a>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Free forever plan · works on your phone · your data stays yours
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-brand-200/70 via-violet-200/50 to-amber-100/60 blur-2xl" />
              <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Monday, 9:00</p>
                    <p className="text-base font-semibold text-slate-900">Your day, handled</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    3 to send
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {[
                    { icon: "clock", title: "Follow up with Amara", meta: "Due today · WhatsApp ready", tone: "bg-amber-50 text-amber-700" },
                    { icon: "star", title: "Ask Priya for a review", meta: "After yesterday's visit", tone: "bg-violet-50 text-violet-700" },
                    { icon: "share", title: "Daniel shared his code", meta: "Referral signed up", tone: "bg-emerald-50 text-emerald-700" },
                    { icon: "palette", title: "Weekend offer poster", meta: "Draft saved in Studio", tone: "bg-brand-50 text-brand-700" },
                  ].map((item) => (
                    <li key={item.title} className="flex items-center gap-3 py-3.5">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl ${item.tone}`}>
                        <Icon name={item.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.meta}</p>
                      </div>
                      <span className="h-5 w-5 rounded-full border-2 border-slate-200" />
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
                  <p className="text-xs text-slate-300">This month</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold">Repeat customers</p>
                      <p className="text-xs text-slate-400">Grow with every follow-up you finish</p>
                    </div>
                    <div className="flex h-12 items-end gap-1.5">
                      {[35, 45, 40, 60, 70, 85, 100].map((height, index) => (
                        <span key={index} className="w-2 rounded-t bg-gradient-to-t from-brand-500 to-violet-400" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value strip */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
            {[
              { title: "One place, not seven tabs", body: "CRM, reminders, reviews, referrals and marketing share the same customer record." },
              { title: "Free tools only", body: "No paid AI APIs. Captions, messages and posters are generated locally from your inputs." },
              { title: "Secure by construction", body: "Every table is protected by Row Level Security, tested against real attacks." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <Check />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Everything you need</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              A full growth toolkit, without the tool sprawl
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              BookedOut replaces the notes app, the reminder list, the review spreadsheet and the design tool you
              only open once a month.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={feature.icon} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-3">
              <div>
                <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">How it works</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">From signup to your first review in ten minutes</h2>
                <p className="mt-4 text-slate-300">
                  No onboarding call, no import wizard, no credit card. Create your business, add a few customers
                  and start with the follow-up queue.
                </p>
              </div>
              <div className="space-y-6 lg:col-span-2 lg:grid-cols-3 lg:space-y-0 lg:gap-6 lg:grid">
                {[
                  { step: "01", title: "Create your business", body: "Add your name, industry, currency and WhatsApp number. Your brand kit is ready to edit." },
                  { step: "02", title: "Bring in customers", body: "Add customers with tags and notes, or move your existing list in from a spreadsheet." },
                  { step: "03", title: "Let the queue work", body: "Follow-ups, review requests and win-back messages are prepared for you each day." },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm font-bold text-brand-300">{item.step}</p>
                    <p className="mt-3 text-lg font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Industries */}
        <section id="industries" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Made for your work</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Built for businesses that live on repeat customers
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                If your growth comes from people coming back — and bringing a friend — BookedOut fits the way you
                already work. Every business gets its own private workspace.
              </p>
              <Link href="/signup" className="btn-primary mt-6">
                Start free
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INDUSTRIES.map((industry) => (
                <div
                  key={industry}
                  className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-4 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {industry}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Start free. Upgrade when it pays for itself.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Prices shown are planned pricing. Payments are not live yet — billing is in test mode and no card
                is requested or charged.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={
                    plan.highlighted
                      ? "relative rounded-3xl border-2 border-brand-600 bg-white p-7 shadow-xl shadow-brand-600/10"
                      : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                  }
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 min-h-10 text-sm text-slate-600">{plan.tagline}</p>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    <span className="text-sm text-slate-500">{plan.price === 0 ? plan.cadence : plan.cadence}</span>
                  </p>
                  <Link
                    href="/signup"
                    className={plan.highlighted ? "btn-primary mt-6 w-full" : "btn-secondary mt-6 w-full"}
                  >
                    {plan.price === 0 ? "Create free account" : `Choose ${plan.name}`}
                  </Link>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm text-slate-700">
                        <Check />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Questions, answered</h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <summary className="flex items-center justify-between gap-4 text-left">
                  <span className="text-sm font-semibold text-slate-900 sm:text-base">{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition group-open:rotate-45">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 px-6 py-14 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
              Your next regular is already in your customer list.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-indigo-100">
              Create your free workspace, add your first customer, and send the follow-up you have been putting off.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-600">
              The customer growth workspace for service businesses. Built with Next.js, TypeScript and Supabase.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-900 uppercase">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><a href="#features" className="hover:text-slate-900">Features</a></li>
              <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
              <li><a href="#industries" className="hover:text-slate-900">Industries</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-900 uppercase">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/signup" className="hover:text-slate-900">Create account</Link></li>
              <li><Link href="/login" className="hover:text-slate-900">Sign in</Link></li>
              <li><Link href="/forgot-password" className="hover:text-slate-900">Reset password</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-900 uppercase">Trust</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Row Level Security</li>
              <li>No data selling</li>
              <li>Export your posters</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} BookedOut. Preview build — payments are in test mode.
        </div>
      </footer>
    </div>
  );
}
