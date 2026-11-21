/**
 * Creative Studio model.
 *
 * A design is a background plus an ordered list of layers. Everything is plain
 * JSON so it can be stored in Postgres (`designs.data`) and redrawn exactly on
 * load. Rendering happens on a real canvas in the browser; no image service is
 * involved, and PNG export is generated locally.
 */

export type DesignLayer = {
  id: string;
  type: "text" | "shape" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  shape?: "rect" | "circle" | "line";
  radius?: number;
  opacity?: number;
  src?: string;
};

export type DesignData = {
  background: string;
  backgroundSecondary: string;
  useGradient: boolean;
  layers: DesignLayer[];
};

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
  headingFont?: string;
  bodyFont?: string;
};

let counter = 0;
export function newLayerId(prefix = "layer") {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function textLayer(overrides: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: newLayerId("text"),
    type: "text",
    x: 90,
    y: 120,
    width: 900,
    height: 240,
    text: "Your text here",
    color: "#ffffff",
    fontSize: 96,
    fontFamily: "Inter",
    fontWeight: 800,
    align: "left",
    opacity: 1,
    ...overrides,
  };
}

function shapeLayer(shape: "rect" | "circle" | "line", overrides: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: newLayerId("shape"),
    type: "shape",
    shape,
    x: 90,
    y: 700,
    width: 900,
    height: 8,
    color: "#f59e0b",
    radius: 8,
    opacity: 1,
    ...overrides,
  };
}

export type TemplateId = "offer" | "arrival" | "review" | "quote" | "blank";

export const TEMPLATES: Array<{ id: TemplateId; name: string; description: string }> = [
  { id: "offer", name: "Weekend offer", description: "Bold gradient with a strong price message" },
  { id: "arrival", name: "New arrival", description: "Clean announcement on your brand colour" },
  { id: "review", name: "5-star review", description: "Share social proof in a customer's words" },
  { id: "quote", name: "Brand quote", description: "Minimal typographic poster" },
  { id: "blank", name: "Blank canvas", description: "Start from your brand background" },
];

export function buildTemplate(id: TemplateId, businessName: string, brand: BrandColors): DesignData {
  const name = businessName || "Your business";
  const primary = brand.primary || "#2559c7";
  const secondary = brand.secondary || "#0f172a";
  const accent = brand.accent || "#f59e0b";
  const heading = brand.headingFont || "Inter";
  const body = brand.bodyFont || "Inter";

  switch (id) {
    case "arrival":
      return {
        background: primary,
        backgroundSecondary: secondary,
        useGradient: false,
        layers: [
          textLayer({ text: "JUST IN", x: 90, y: 110, width: 900, height: 90, fontSize: 40, fontWeight: 700, color: accent, fontFamily: body }),
          textLayer({ text: "New arrivals\nfor the season", x: 90, y: 220, width: 900, height: 290, fontSize: 110, fontFamily: heading }),
          shapeLayer("line", { x: 90, y: 560, width: 160, height: 8, color: accent }),
          textLayer({ text: "Come and see what's new.\nBooking link in bio.", x: 90, y: 620, width: 780, height: 130, fontSize: 40, fontWeight: 400, fontFamily: body, color: "#ffffff" }),
          textLayer({ text: name, x: 90, y: 1180, width: 900, height: 70, fontSize: 34, fontWeight: 600, fontFamily: body, color: "#ffffff" }),
        ],
      };
    case "review":
      return {
        background: "#ffffff",
        backgroundSecondary: "#eef2ff",
        useGradient: true,
        layers: [
          textLayer({ text: "★★★★★", x: 90, y: 190, width: 900, height: 100, fontSize: 66, color: accent, fontFamily: body }),
          textLayer({
            text: "“Honestly the best experience I've had in years. I've already told three friends.”",
            x: 90,
            y: 340,
            width: 880,
            height: 420,
            fontSize: 72,
            color: secondary,
            fontFamily: heading,
            fontWeight: 700,
          }),
          textLayer({ text: "— A happy customer", x: 90, y: 820, width: 700, height: 80, fontSize: 36, fontWeight: 500, color: secondary, fontFamily: body }),
          shapeLayer("line", { x: 90, y: 960, width: 140, height: 6, color: primary }),
          textLayer({ text: name.toUpperCase(), x: 90, y: 1030, width: 900, height: 80, fontSize: 40, fontWeight: 700, color: primary, fontFamily: body }),
        ],
      };
    case "quote":
      return {
        background: secondary,
        backgroundSecondary: primary,
        useGradient: false,
        layers: [
          textLayer({ text: "“", x: 70, y: 90, width: 300, height: 160, fontSize: 180, color: accent, fontFamily: heading, fontWeight: 800 }),
          textLayer({
            text: "Small details, done properly, every single time.",
            x: 90,
            y: 380,
            width: 900,
            height: 360,
            fontSize: 92,
            color: "#ffffff",
            fontFamily: heading,
            fontWeight: 700,
          }),
          shapeLayer("line", { x: 90, y: 840, width: 160, height: 8, color: accent }),
          textLayer({ text: name, x: 90, y: 910, width: 900, height: 80, fontSize: 40, fontWeight: 500, color: "#cbd5e1", fontFamily: body }),
        ],
      };
    case "blank":
      return {
        background: primary,
        backgroundSecondary: secondary,
        useGradient: true,
        layers: [
          textLayer({ text: name, x: 90, y: 560, width: 900, height: 160, fontSize: 104, fontFamily: heading, fontWeight: 800, color: "#ffffff" }),
        ],
      };
    case "offer":
    default:
      return {
        background: primary,
        backgroundSecondary: secondary,
        useGradient: true,
        layers: [
          textLayer({ text: "WEEKEND", x: 90, y: 180, width: 900, height: 120, fontSize: 64, fontWeight: 700, color: accent, fontFamily: body }),
          textLayer({ text: "20% OFF", x: 90, y: 340, width: 920, height: 220, fontSize: 180, fontWeight: 900, color: "#ffffff", fontFamily: heading }),
          textLayer({
            text: "Book this Saturday and Sunday\nto claim your spot.",
            x: 90,
            y: 600,
            width: 820,
            height: 160,
            fontSize: 44,
            fontWeight: 400,
            color: "#e2e8f0",
            fontFamily: body,
          }),
          shapeLayer("rect", { x: 90, y: 830, width: 380, height: 100, color: accent, radius: 50, opacity: 1 }),
          textLayer({ text: "Book now", x: 130, y: 862, width: 300, height: 60, fontSize: 36, fontWeight: 700, color: secondary, fontFamily: body }),
          textLayer({ text: name, x: 90, y: 1190, width: 900, height: 80, fontSize: 38, fontWeight: 600, color: "#ffffff", fontFamily: body }),
        ],
      };
  }
}

/** Loads design JSON defensively; stored designs can predate a model change. */
export function normalizeDesign(input: unknown, fallback: DesignData): DesignData {
  if (!input || typeof input !== "object") return fallback;
  const data = input as Partial<DesignData>;

  if (!Array.isArray(data.layers)) return fallback;

  const layers = data.layers
    .filter((layer): layer is DesignLayer => Boolean(layer) && typeof layer === "object")
    .filter((layer) => ["text", "shape", "image"].includes(layer.type))
    .map((layer) => ({
      ...layer,
      id: layer.id || newLayerId(layer.type),
      x: Number.isFinite(layer.x) ? layer.x : 80,
      y: Number.isFinite(layer.y) ? layer.y : 80,
      width: Number.isFinite(layer.width) ? layer.width : 400,
      height: Number.isFinite(layer.height) ? layer.height : 120,
    }));

  return {
    background: typeof data.background === "string" ? data.background : fallback.background,
    backgroundSecondary:
      typeof data.backgroundSecondary === "string" ? data.backgroundSecondary : fallback.backgroundSecondary,
    useGradient: Boolean(data.useGradient),
    layers,
  };
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}
