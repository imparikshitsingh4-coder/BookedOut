/**
 * WhatsApp helpers.
 *
 * Click-to-chat uses the official `https://wa.me/<number>?text=<text>` link, which
 * opens WhatsApp (or WhatsApp Web) with a prefilled message. Nothing is sent
 * automatically and no paid API is involved: the business owner reviews and sends
 * the message themselves.
 */

export function toWaNumber(phone: string | null | undefined) {
  return (phone ?? "").replace(/[^\d]/g, "");
}

export function waChatLink(phone: string | null | undefined, message: string) {
  const number = toWaNumber(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export type MessageContext = {
  businessName: string;
  customerName?: string | null;
  signature?: string | null;
  offer?: string | null;
  reviewLink?: string | null;
  referralCode?: string | null;
};

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? "there";
}

export type MessageKind = "follow_up" | "review_request" | "referral_invite" | "reactivation" | "promo";

const TEMPLATES: Record<MessageKind, (ctx: MessageContext) => string> = {
  follow_up: (ctx) =>
    `Hi ${firstName(ctx.customerName)}, it's ${ctx.businessName} here. Just checking in — is there anything you need from us this week?\n\n${
      ctx.signature ?? ""
    }`.trim(),
  review_request: (ctx) =>
    `Hi ${firstName(ctx.customerName)}, thank you for choosing ${ctx.businessName}! If you have a minute, a quick review really helps us. ${
      ctx.reviewLink ? `\n\n${ctx.reviewLink}` : ""
    }`.trim(),
  referral_invite: (ctx) =>
    `Hi ${firstName(ctx.customerName)}, thank you for being a ${ctx.businessName} customer. Know someone who would love us too? Share your code ${
      ctx.referralCode ?? ""
    } and you both get a thank-you from us.`.trim(),
  reactivation: (ctx) =>
    `Hi ${firstName(ctx.customerName)}, we've missed you at ${ctx.businessName}! ${
      ctx.offer ? `${ctx.offer} ` : ""
    }Would you like to book your next visit?`.trim(),
  promo: (ctx) =>
    `Hi ${firstName(ctx.customerName)}, a quick update from ${ctx.businessName}: ${
      ctx.offer ?? "we have something new for you"
    }. Reply here if you'd like to know more.`.trim(),
};

export function buildMessage(kind: MessageKind, ctx: MessageContext) {
  return TEMPLATES[kind](ctx);
}

/** Deterministic, free caption + hashtag generator (no AI API involved). */
export function generateCaption(input: {
  businessName: string;
  industry?: string | null;
  topic: string;
  offer?: string | null;
  tone: string;
  callToAction?: string | null;
}) {
  const topic = input.topic.trim() || "something new";
  const industry = (input.industry ?? "service").toLowerCase();
  const offer = input.offer?.trim();
  const cta = input.callToAction?.trim() || "Send us a message to book.";

  const openers: Record<string, string> = {
    friendly: `Big news from ${input.businessName}! ${topic[0]?.toUpperCase()}${topic.slice(1)}.`,
    bold: `Stop scrolling. ${topic[0]?.toUpperCase()}${topic.slice(1)} — only at ${input.businessName}.`,
    simple: `${topic[0]?.toUpperCase()}${topic.slice(1)} at ${input.businessName}.`,
    luxury: `An experience worth making time for. ${topic[0]?.toUpperCase()}${topic.slice(1)} at ${input.businessName}.`,
  };

  const body = offer ? `\n\n${offer}` : "";
  const caption = `${openers[input.tone] ?? openers.friendly}${body}\n\n${cta}`;

  const words = `${input.businessName} ${industry} ${topic} ${offer ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const unique = Array.from(new Set(words)).slice(0, 6);
  const hashtags = [...unique.map((word) => `#${word}`), "#bookedout", `#${industry.replace(/\s+/g, "")}`].join(" ");

  return { caption, hashtags };
}

/** A short, readable referral code derived from the business name. */
export function makeReferralCode(businessName: string) {
  const base = businessName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5) || "BOOK";
  return `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
