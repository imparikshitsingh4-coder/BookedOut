import Link from "next/link";

import { loadBusiness } from "@/lib/businesses/context";
import {
  createCampaignAction,
  deleteCampaignAction,
  deletePostAction,
  updatePostStatusAction,
} from "@/lib/marketing/actions";
import { CaptionGenerator } from "@/components/marketing/caption-generator";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  title: string;
  caption: string;
  hashtags: string | null;
  platform: string;
  status: "idea" | "draft" | "scheduled" | "published";
  scheduled_for: string | null;
  published_at: string | null;
  campaign_id: string | null;
};

type Campaign = {
  id: string;
  name: string;
  goal: string | null;
  audience: string | null;
  message: string | null;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
};

const PLATFORMS = ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "email"];

function monthRange(monthParam?: string) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [rawYear, rawMonth] = monthParam.split("-").map(Number);
    if (rawYear >= 2000 && rawMonth >= 1 && rawMonth <= 12) {
      year = rawYear;
      month = rawMonth - 1;
    }
  }

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first grid
  const cells: Array<{ date: Date | null; key: string }> = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ date: null, key: `blank-start-${index}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, key: date.toISOString() });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `blank-end-${cells.length}` });
  }

  const previous = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const stamp = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return { year, month, cells, previous: stamp(previous), next: stamp(next) };
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default async function MarketingPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string; month?: string }>;
}) {
  const { businessId } = await params;
  const { message, error, month } = await searchParams;
  const { supabase, business } = await loadBusiness(businessId);

  const [{ data: postRows }, { data: campaignRows }] = await Promise.all([
    supabase
      .from("marketing_posts")
      .select("id, title, caption, hashtags, platform, status, scheduled_for, published_at, campaign_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("campaigns")
      .select("id, name, goal, audience, message, status, starts_on, ends_on")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const posts = (postRows ?? []) as Post[];
  const campaigns = (campaignRows ?? []) as Campaign[];
  const calendar = monthRange(month);

  const postsByDay = new Map<string, Post[]>();
  for (const post of posts) {
    if (!post.scheduled_for) continue;
    const key = dayKey(new Date(post.scheduled_for));
    postsByDay.set(key, [...(postsByDay.get(key) ?? []), post]);
  }

  const scheduled = posts.filter((post) => post.status === "scheduled").length;
  const published = posts.filter((post) => post.status === "published").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing toolkit"
        description="Captions and hashtags from your own details, campaigns, and a content calendar that keeps you consistent."
        action={
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2"><strong>{scheduled}</strong> scheduled</span>
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2"><strong>{published}</strong> published</span>
          </div>
        }
      />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader title="Caption & hashtag generator" description="Free, local and based on your inputs. Save the result straight to the calendar." />
          <CaptionGenerator businessId={businessId} businessName={business.name} industry={business.industry} />
        </Card>

        <Card>
          <CardHeader
            title="Campaigns"
            description="Group posts around one goal."
            action={
              <details>
                <summary className="btn-secondary list-none !py-2">+ Campaign</summary>
                <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,26rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <form action={createCampaignAction} className="space-y-3">
                    <input type="hidden" name="business_id" value={businessId} />
                    <div>
                      <label className="label">Campaign name</label>
                      <input name="name" required className="field" placeholder="Autumn rebooking" />
                    </div>
                    <div>
                      <label className="label">Goal</label>
                      <input name="goal" className="field" placeholder="Fill quiet Tuesdays" />
                    </div>
                    <div>
                      <label className="label">Audience</label>
                      <input name="audience" className="field" placeholder="Customers who visited 6+ weeks ago" />
                    </div>
                    <div>
                      <label className="label">Core message</label>
                      <textarea name="message" rows={2} className="field" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="label">Starts</label>
                        <input type="date" name="starts_on" className="field" />
                      </div>
                      <div>
                        <label className="label">Ends</label>
                        <input type="date" name="ends_on" className="field" />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary w-full">Create campaign</button>
                  </form>
                </div>
              </details>
            }
          />
          <div className="px-5 py-4">
            {campaigns.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No campaigns yet. A campaign is simply a reason for your next few posts.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{campaign.name}</p>
                      {campaign.goal && <p className="text-sm text-slate-600">{campaign.goal}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        {campaign.starts_on ? formatDate(campaign.starts_on) : "No start"}
                        {campaign.ends_on ? ` → ${formatDate(campaign.ends_on)}` : ""}
                        {" · "}
                        <span className="capitalize">{campaign.status}</span>
                      </p>
                    </div>
                    <form action={deleteCampaignAction}>
                      <input type="hidden" name="business_id" value={businessId} />
                      <input type="hidden" name="campaign_id" value={campaign.id} />
                      <button type="submit" className="btn-danger">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Content calendar — ${monthLabel(new Date(calendar.year, calendar.month, 1))} ${calendar.year}`}
          description="Scheduled posts by day. Click a post to see it in the library."
          action={
            <div className="flex items-center gap-1">
              <Link href={`/dashboard/businesses/${businessId}/marketing?month=${calendar.previous}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                ←
              </Link>
              <Link href={`/dashboard/businesses/${businessId}/marketing`} className="btn-ghost">Today</Link>
              <Link href={`/dashboard/businesses/${businessId}/marketing?month=${calendar.next}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                →
              </Link>
            </div>
          }
        />
        <div className="overflow-x-auto p-4">
          <div className="grid min-w-[640px] grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
            {calendar.cells.map((cell) => {
              const dayPosts = cell.date ? postsByDay.get(dayKey(cell.date)) ?? [] : [];
              const isToday = cell.date?.toDateString() === new Date().toDateString();
              return (
                <div
                  key={cell.key}
                  className={`min-h-24 rounded-lg border p-1.5 text-left ${
                    cell.date ? "border-slate-200 bg-white" : "border-transparent bg-slate-50/60"
                  } ${isToday ? "ring-2 ring-brand-300" : ""}`}
                >
                  {cell.date && (
                    <>
                      <p className={`text-xs ${isToday ? "font-bold text-brand-700" : "text-slate-500"}`}>
                        {cell.date.getDate()}
                      </p>
                      <div className="mt-1 space-y-1">
                        {dayPosts.slice(0, 3).map((post) => (
                          <p
                            key={post.id}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                              post.status === "published"
                                ? "bg-emerald-50 text-emerald-700"
                                : post.status === "scheduled"
                                  ? "bg-brand-50 text-brand-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                            title={`${post.title} · ${post.platform}`}
                          >
                            {post.title}
                          </p>
                        ))}
                        {dayPosts.length > 3 && (
                          <p className="text-[10px] text-slate-400">+{dayPosts.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Post library (${posts.length})`} description="Every idea, draft and published post." />
        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description="Generate a caption above and save it to the calendar — it will appear here and on the calendar."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {posts.map((post) => (
              <li key={post.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{post.title}</p>
                      <Badge tone={post.status === "published" ? "green" : post.status === "scheduled" ? "brand" : "slate"}>
                        {post.status}
                      </Badge>
                      <span className="text-xs text-slate-500 capitalize">{post.platform}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {post.scheduled_for ? `Scheduled ${formatDateTime(post.scheduled_for)}` : "No date set"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={updatePostStatusAction} className="flex items-center gap-1">
                      <input type="hidden" name="business_id" value={businessId} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <select name="status" defaultValue={post.status} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                        <option value="idea">Idea</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                      <button type="submit" className="btn-ghost">Save</button>
                    </form>
                    <form action={deletePostAction}>
                      <input type="hidden" name="business_id" value={businessId} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <button type="submit" className="btn-danger">×</button>
                    </form>
                  </div>
                </div>
                <details>
                  <summary className="text-xs font-medium text-brand-600">View caption & hashtags</summary>
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">{post.caption}</p>
                  {post.hashtags && <p className="mt-1 text-xs text-slate-500">{post.hashtags}</p>}
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
