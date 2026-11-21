import Link from "next/link";

import { loadBusiness } from "@/lib/businesses/context";
import {
  deleteReviewAction,
  recordReviewAction,
  requestReviewAction,
  respondToReviewAction,
} from "@/lib/reviews/actions";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { buildMessage, waChatLink } from "@/lib/whatsapp";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Review = {
  id: string;
  rating: number | null;
  comment: string | null;
  response: string | null;
  status: "requested" | "received" | "responded";
  requested_at: string;
  received_at: string | null;
  customer_id: string | null;
  customers: { full_name: string; phone: string | null; whatsapp_opt_in: boolean } | null;
};

type CustomerOption = { id: string; full_name: string };

function Stars({ rating }: { rating: number | null }) {
  return (
    <span className="text-amber-500" aria-label={rating ? `${rating} out of 5 stars` : "No rating yet"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{rating && star <= rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default async function ReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string; qr?: string }>;
}) {
  const { businessId } = await params;
  const { message, error, qr } = await searchParams;
  const { supabase, business } = await loadBusiness(businessId);

  const [{ data: reviews }, { data: customers }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, comment, response, status, requested_at, received_at, customer_id, customers(full_name, phone, whatsapp_opt_in)")
      .eq("business_id", businessId)
      .order("requested_at", { ascending: false })
      .limit(200),
    supabase.from("customers").select("id, full_name").eq("business_id", businessId).order("full_name").limit(500),
  ]);

  const rows = (reviews ?? []) as unknown as Review[];
  const customerOptions = (customers ?? []) as CustomerOption[];
  const rated = rows.filter((review) => review.rating !== null);
  const average = rated.length ? rated.reduce((total, review) => total + (review.rating ?? 0), 0) / rated.length : null;
  const awaiting = rows.filter((review) => review.status === "requested").length;
  const reviewLink = business.review_link ?? business.website ?? "";
  const qrData = qr?.trim() || reviewLink;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Ask at the right moment, capture the rating, and reply while it is fresh."
      />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Average rating</p>
          <p className="mt-2 text-2xl font-semibold">{average ? average.toFixed(1) : "—"}</p>
          <div className="mt-1 text-sm"><Stars rating={average ? Math.round(average) : null} /></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Awaiting a reply</p>
          <p className="mt-2 text-2xl font-semibold">{rows.filter((review) => review.status === "received").length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Requests logged</p>
          <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          <p className="mt-1 text-xs text-slate-500">{awaiting} still to send</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Request a review" description="Logs the request; send it with WhatsApp in one tap." />
            <form action={requestReviewAction} className="flex flex-wrap items-end gap-3 px-5 py-4">
              <input type="hidden" name="business_id" value={businessId} />
              <div className="min-w-48 flex-1">
                <label className="label">Customer</label>
                <select name="customer_id" required className="field">
                  <option value="">Choose a customer</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">Log request</button>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Review history (${rows.length})`} description="Newest first" />
            {rows.length === 0 ? (
              <EmptyState
                title="No review requests yet"
                description="Add a customer first, then ask them for a review after their next visit."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((review) => {
                  const customerName = review.customers?.full_name ?? "Customer";
                  const requestMessage = buildMessage("review_request", {
                    businessName: business.name,
                    customerName,
                    reviewLink: reviewLink || null,
                  });
                  const canWhatsApp = Boolean(review.customers?.phone && review.customers.whatsapp_opt_in);

                  return (
                    <li key={review.id} className="space-y-3 px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{customerName}</p>
                            <Badge tone={review.status === "requested" ? "amber" : review.status === "received" ? "brand" : "green"}>
                              {review.status}
                            </Badge>
                            <Stars rating={review.rating} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested {formatDate(review.requested_at)}
                            {review.received_at ? ` · received ${formatDate(review.received_at)}` : ""}
                          </p>
                        </div>
                        <form action={deleteReviewAction}>
                          <input type="hidden" name="business_id" value={businessId} />
                          <input type="hidden" name="review_id" value={review.id} />
                          <button type="submit" className="btn-danger">Delete</button>
                        </form>
                      </div>

                      {review.comment && (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">“{review.comment}”</p>
                      )}

                      {review.status === "requested" && (
                        <div className="flex flex-wrap items-end gap-3">
                          {canWhatsApp && (
                            <a href={waChatLink(review.customers?.phone, requestMessage)} target="_blank" rel="noreferrer" className="btn-secondary !py-2 text-emerald-700">
                              Send on WhatsApp
                            </a>
                          )}
                          <details className="flex-1">
                            <summary className="btn-ghost list-none">Record the review →</summary>
                            <form action={recordReviewAction} className="mt-2 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[6rem_1fr_auto]">
                              <input type="hidden" name="business_id" value={businessId} />
                              <input type="hidden" name="review_id" value={review.id} />
                              <select name="rating" required className="field" defaultValue="5">
                                {[5, 4, 3, 2, 1].map((value) => (
                                  <option key={value} value={value}>{value} ★</option>
                                ))}
                              </select>
                              <input name="comment" className="field" placeholder="What did they say?" />
                              <button type="submit" className="btn-primary !py-2">Save</button>
                            </form>
                          </details>
                        </div>
                      )}

                      {review.status === "received" && (
                        <details>
                          <summary className="text-sm font-medium text-brand-600">Write a reply →</summary>
                          <form action={respondToReviewAction} className="mt-2 space-y-2">
                            <input type="hidden" name="business_id" value={businessId} />
                            <input type="hidden" name="review_id" value={review.id} />
                            <textarea name="response" rows={2} required className="field" placeholder="Thank you for the feedback…" />
                            <button type="submit" className="btn-primary !py-2">Save reply</button>
                          </form>
                        </details>
                      )}

                      {review.response && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                          <p className="text-xs font-semibold uppercase">Your reply</p>
                          <p className="mt-1">{review.response}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Review QR code" description="Print it at reception, on receipts or on a table card." />
          <div className="space-y-4 px-5 py-4">
            {!reviewLink && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Add a review link in{" "}
                <Link href={`/dashboard/businesses/${businessId}/settings`} className="font-semibold underline">
                  Settings
                </Link>{" "}
                (Google, Trustpilot, Facebook…) or paste any URL below.
              </p>
            )}
            <form className="flex gap-2" action={`/dashboard/businesses/${businessId}/reviews`}>
              <input
                name="qr"
                defaultValue={qr ?? ""}
                className="field"
                placeholder={reviewLink || "https://g.page/r/…"}
              />
              <button type="submit" className="btn-secondary">Make</button>
            </form>

            {qrData ? (
              <div className="space-y-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr?data=${encodeURIComponent(qrData)}`}
                  alt={`QR code for ${qrData}`}
                  className="mx-auto h-48 w-48 rounded-xl border border-slate-200 bg-white p-2"
                />
                <p className="break-all text-xs text-slate-500">{qrData}</p>
                <a
                  href={`/api/qr?data=${encodeURIComponent(qrData)}&download=1`}
                  className="btn-primary w-full"
                >
                  Download SVG
                </a>
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Your QR code appears here once a link is set.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
