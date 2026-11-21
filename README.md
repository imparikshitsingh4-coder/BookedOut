# BookedOut

The customer growth workspace for service businesses — customers, follow-ups, reviews, referrals, marketing and poster design in one place.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4** and **Supabase** (Postgres + Auth). Everything is real: real sessions, real database persistence, real Row Level Security, real PNG export. There is no mock backend and no pretend payment.

---

## What is implemented

| Area | What works |
| --- | --- |
| Marketing site | Landing page with hero, feature grid, industries, pricing and FAQ. Fully responsive. |
| Authentication | Sign up, sign in, sign out, email verification, password reset, password change. Cookie sessions via `@supabase/ssr`. |
| Multi-tenant database | 13 tables, all protected by RLS. Business creator automatically becomes owner; brand kit and subscription are created with the business. |
| Business dashboard | Analytics overview: customer growth (6 months), pipeline, overdue follow-ups, rating, scheduled posts, saved designs. |
| Customer CRM | Create, read, update, delete. Search, stage filter, tags, notes, WhatsApp opt-in, last-contacted tracking. |
| Follow-ups | Due-date queue, overdue/today counts, channel, complete, snooze one day, delete. WhatsApp message prefilled. |
| Reviews | Log requests, send request via WhatsApp, record rating and comment, reply, delete. Review QR code generator with SVG download. |
| Referrals | Unique referral codes, referral tracking, status updates, WhatsApp share message, win-back list of inactive customers with reactivation message. |
| Marketing toolkit | Local caption + hashtag generator (no AI API), campaigns, content calendar by month, post library, status changes. |
| Creative Studio | Real canvas poster editor: templates, draggable text/shapes/images, colours, fonts, sizes, opacity, layer order, brand kit defaults, save/load designs, PNG export. |
| Brand kit | Logo (data URL), three brand colours, heading/body fonts, tone, message signature. Feeds the Studio. |
| Billing | Plan catalogue, test-mode subscription state, plan changes, cancel and resume. Provider architecture ready for a real processor. **No card is requested and nothing is charged.** |
| Account | Profile, password change (re-authenticates first), business list. |
| Platform admin | Read-only cross-tenant overview for users flagged in `platform_admins`. |

Not included: online booking/calendar, email sending, WhatsApp Business API, live card payments, file storage service, team invitations by email. Each is a deliberate scope decision, not a stub.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, server components, server actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Supabase Postgres |
| Auth | Supabase Auth, email + password, cookie sessions |
| QR codes | `qrcode` (MIT) rendered server-side as SVG |
| Poster export | Native Canvas 2D, `toDataURL("image/png")` |
| Tests | `node:test` + PGlite (real Postgres in-process) |

No paid service or paid API is required, and no AI API is used. The caption generator is deterministic logic over your own inputs.

---

## Local setup

Prerequisites: Node.js 20+, Docker (for the local Supabase stack), and `npx` (the Supabase CLI is used through npx).

```bash
npm install
npx supabase start          # Postgres, Auth, Studio, local email inbox
cp .env.example .env.local  # paste the URL + anon key printed by `supabase start`
npx supabase db reset       # applies every migration in order
npm run dev                 # http://localhost:3000
```

Local endpoints:

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Studio | http://localhost:54323 |
| Email inbox (verification + reset) | http://localhost:54324 |

`supabase start` prints an anon key — put it in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The service role key is optional and never used by the app UI.

## Hosted Supabase (free tier is enough)

1. Create a project at supabase.com.
2. Copy **Project Settings → API → Project URL** and the **anon/publishable key** into `.env.local`.
3. Push the schema:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

4. In **Authentication → URL Configuration**, set the Site URL (for local work: `http://localhost:3000`) and add:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/confirm`
5. Keep **Confirm email** enabled.

## Testing email verification and password reset

`supabase/config.toml` enables confirmations for the local stack, so both flows send real emails to http://localhost:54324.

**Verification:** sign up at `/signup`, open the newest message in the inbox, click the confirmation link → you land on `/dashboard` with a real session.

**Reset:** submit `/forgot-password`, open the email, click through to `/reset-password`, set a new password, sign in.

If a link opens in a different browser than the one that signed up, the default PKCE link cannot exchange. The app therefore also supports the browser-independent `token_hash` flow. Point the email templates at:

```html
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

```html
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

`/auth/callback` (code exchange) and `/auth/confirm` (token hash) are both wired.

---

## Database

Migrations apply in filename order:

| File | Contents |
| --- | --- |
| `20261121090000_core_schema.sql` | `profiles`, `businesses`, `business_members`, `customers`; role enum; `updated_at` trigger; auto-profile and auto-owner triggers |
| `20261121090100_helper_functions.sql` | `is_business_member`, `has_business_role`, `shares_business_with` (SECURITY DEFINER, pinned `search_path`) |
| `20261121090200_rls_policies.sql` | RLS for the core tables and all core policies |
| `20261121100000_growth_schema.sql` | CRM fields, `follow_ups`, `reviews`, `referrals`, `campaigns`, `marketing_posts`, `brand_kits`, `designs`, `subscriptions`, `platform_admins`, `is_platform_admin()` |
| `20261121100100_growth_rls.sql` | RLS for every growth table + platform-admin read policies |
| `20261121100200_business_defaults.sql` | On business creation: brand kit + test-mode trial; `review_link` column |

### Tables

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user, created by trigger |
| `businesses` | Tenant record: name, slug, industry, contact details, WhatsApp number, review link, timezone, currency |
| `business_members` | The **only** source of authorization: `owner` / `admin` / `staff` |
| `customers` | Tenant-scoped CRM rows: stage (`lead`/`active`/`vip`/`inactive`), tags, notes, last contact, WhatsApp opt-in |
| `follow_ups` | Reminder queue with customer, channel, due date and status |
| `reviews` | Review requests, ratings, comments, replies |
| `referrals` | Referrer, referred person, unique code per business, status, reward note |
| `campaigns` | Marketing campaigns with goal, audience and dates |
| `marketing_posts` | Captions, hashtags, platform, status and schedule (content calendar) |
| `brand_kits` | One per business: logo, three colours, fonts, tone, signature |
| `designs` | Saved Studio posters as editable JSON layers |
| `subscriptions` | Plan, status, provider, trial and period dates |
| `platform_admins` | BookedOut staff, added with SQL only |

Design notes:

- `business_members` is the only authorization source. There is no `owner_id` flag a client can set.
- Creating a business inserts its owner membership, brand kit and test-mode subscription by trigger.
- `customers` email is unique per `(business_id, lower(email))` when present.
- `referrals.code` is unique per business, so two businesses can use the same code.
- `updated_at` is maintained by trigger everywhere it exists.

---

## Security model

RLS is on for every table. `anon` has **no** table grants. All tenant reads go through `is_business_member(business_id)`; sensitive writes require `owner` or `admin`.

| Action | anon | staff | admin | owner |
| --- | --- | --- | --- | --- |
| Read business, members, customers, follow-ups, reviews, referrals, marketing, designs, brand kit, subscription | — | yes | yes | yes |
| Create business | — | yes (as themselves) | yes | yes |
| Update business / brand kit | — | — | yes | yes |
| Add member | — | — | staff only | any role |
| Change role / delete member | — | — | staff only | non-owner rows |
| Create/update customer | — | yes | yes | yes |
| Delete customer | — | — | yes | yes |
| Create/update follow-up, review, referral, post, design | — | yes (as themselves) | yes | yes |
| Delete growth rows | — | — | yes | yes |
| Change billing | — | — | — | test provider only |

Deliberate rules:

- You cannot create a business or row attributed to someone else (`created_by = auth.uid()` enforced).
- You cannot promote yourself; the update policy compares the new row with your real role.
- Owner membership rows cannot be deleted through the API, so a business is never orphaned.
- Profiles of colleagues in a shared business are readable; strangers' profiles are not.
- Anonymous requests cannot execute the membership helpers.
- Platform admins get **read-only** cross-tenant access. Writes still go through membership policies (tested).
- `platform_admins` exposes only your own row, so admins cannot be enumerated.

### Making yourself a platform admin

Run this once in the Supabase SQL editor, replacing the email:

```sql
insert into public.platform_admins (user_id)
select p.id
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'you@example.com'
on conflict (user_id) do nothing;
```

Then `/admin` appears in the dashboard header. There is no UI way to grant admin — on purpose.

---

## Payments: test mode, honestly labelled

`src/lib/billing/provider.ts` defines a `PaymentProvider` interface. The only implementation in this build is `TestPaymentProvider` (`PAYMENTS_PROVIDER=test`).

- Choosing a plan writes a subscription row with `provider = 'test'` and `status = 'trialing'`.
- The UI states plainly that no provider is connected, no card is requested and nothing is charged.
- No fake checkout, fake receipt or fake "payment succeeded" state exists.
- Cancelling sets `status = 'canceled'` and keeps all data. Resuming returns to test trial.
- RLS allows the app role to write subscriptions only when `provider = 'test'`. A real processor's state must be written by a trusted server after verifying a signed webhook.

To go live later: implement the interface in server-only code, add its secret as a server environment variable, verify webhooks, and write subscription state with the service role.

---

## Creative Studio

The Studio is a genuine editor, not an image mockup:

- Canvas 2D rendering at 1080×1080, 1080×1350 or 1080×1920.
- Text, rectangle, circle and line layers; uploaded images (stored as data URLs, max 2.5 MB).
- Drag layers directly on the poster; edit text, size, weight, font, alignment, colour, X/Y, opacity, corner radius; reorder layers; delete.
- Templates seeded from the brand kit.
- Save/update/delete designs in Postgres as editable JSON.
- Download PNG generated from an offscreen canvas without the selection outline.

Fonts are limited to system-safe families (Inter falls back to the system UI font) so no external font service or paid asset is needed.

## Analytics

All numbers are computed from rows in your database for the current business: six-month customer growth, pipeline mix, overdue and due-today follow-ups, average rating, converted referrals, scheduled posts and saved designs. Nothing is hardcoded or invented.

---

## Tests and checks

```bash
npm run test:rls     # 45 security tests against real Postgres semantics
npm run typecheck
npm run lint
npm run build
```

The RLS suite loads the real migrations into PGlite with a test-only shim for `auth.users`, `auth.uid()`, `auth.role()` and the Supabase roles, then attacks the policies as `anon`, staff, admin, owner and outsider. It covers core tenancy, CRM, follow-ups, reviews, referrals, marketing, brand kits, designs, subscriptions, platform admin reads vs writes, and anonymous access.

Limitations: the tests validate PostgreSQL RLS and the migrations, not GoTrue behaviour. Email delivery, link exchange, hosted Supabase configuration and browser interaction were not exercised here. Run the manual flow above against a real Supabase instance to verify those.

## Project structure

```
src/
  app/
    page.tsx                        marketing site
    auth/callback|confirm/          email link handlers
    login|signup|forgot-password|reset-password/
    dashboard/
      page.tsx                      business chooser
      account/                      profile + password
      businesses/[businessId]/
        layout.tsx                  shell + navigation
        page.tsx                    analytics overview
        customers|follow-ups|reviews|referrals|marketing|studio|settings|billing/
    api/qr/                         QR SVG + download
    admin/                          platform admin overview
  components/                       UI primitives, nav, studio, forms, image input
  lib/
    auth/ businesses/ crm/ followups/ reviews/ referrals/ marketing/ studio/ settings/ billing/
    supabase/{client,server,middleware}.ts
    whatsapp.ts                     click-to-chat + free caption generator
    env.ts                          lazy env validation
supabase/
  config.toml · migrations/ · seed.sql
tests/rls/                          security suite
```

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key; safe in browsers because RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Optional, for trusted admin scripts. Never used by the UI |
| `PAYMENTS_PROVIDER` | server only | `test` (default). Any other value fails loudly until implemented |

`src/lib/env.ts` validates lazily, so builds work without secrets and misconfiguration shows an actionable message. `.env.local` is git-ignored; `.env.example` has empty placeholders only. No secret is committed.

## Getting this into your GitHub repository

This project is the content for the existing `bookedout` repository. From a machine with your GitHub credentials:

```bash
git add .
git commit -m "BookedOut: auth, CRM, follow-ups, reviews, referrals, marketing, studio and billing"
git push origin main
```

No new repository, paid service or domain is required.
