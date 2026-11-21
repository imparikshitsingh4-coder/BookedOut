"use client";

import { useState } from "react";

import { createPostAction } from "@/lib/marketing/actions";
import { generateCaption } from "@/lib/whatsapp";
import { toLocalInputValue, daysFromNow } from "@/lib/utils";

/**
 * Free caption generator. It builds the copy locally from the business's own
 * details — no AI API, no key, no network request.
 */
export function CaptionGenerator({
  businessId,
  businessName,
  industry,
}: {
  businessId: string;
  businessName: string;
  industry: string | null;
}) {
  const [topic, setTopic] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("friendly");
  const [cta, setCta] = useState("Send us a message to book your spot.");
  const [result, setResult] = useState<{ caption: string; hashtags: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    if (!topic.trim()) return;
    setResult(generateCaption({ businessName, industry, topic, offer, tone, callToAction: cta }));
    setCopied(false);
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.caption}\n\n${result.hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <div>
        <label className="label">What is the post about?</label>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="field"
          placeholder="New autumn colour menu"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Offer (optional)</label>
          <input
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            className="field"
            placeholder="20% off for new clients this week"
          />
        </div>
        <div>
          <label className="label">Tone</label>
          <select value={tone} onChange={(event) => setTone(event.target.value)} className="field">
            <option value="friendly">Friendly</option>
            <option value="bold">Bold</option>
            <option value="simple">Simple</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Call to action</label>
        <input value={cta} onChange={(event) => setCta(event.target.value)} className="field" />
      </div>
      <button type="button" onClick={generate} className="btn-secondary w-full">
        Generate caption & hashtags
      </button>

      {result && (
        <div className="space-y-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Caption</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">{result.caption}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Hashtags</p>
            <p className="mt-1 text-sm text-slate-700">{result.hashtags}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn-ghost !bg-white">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          <form action={createPostAction} className="space-y-2 border-t border-brand-100 pt-3">
            <input type="hidden" name="business_id" value={businessId} />
            <input type="hidden" name="caption" value={result.caption} />
            <input type="hidden" name="hashtags" value={result.hashtags} />
            <input type="hidden" name="title" value={topic} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="platform" className="field" defaultValue="instagram">
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="email">Email</option>
              </select>
              <select name="status" className="field" defaultValue="scheduled">
                <option value="idea">Idea</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <input
              type="datetime-local"
              name="scheduled_for"
              defaultValue={toLocalInputValue(daysFromNow(1))}
              className="field"
            />
            <button type="submit" className="btn-primary w-full">Save to content calendar</button>
          </form>
        </div>
      )}
    </div>
  );
}
