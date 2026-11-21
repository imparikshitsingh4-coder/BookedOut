"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  TEMPLATES,
  buildTemplate,
  newLayerId,
  normalizeDesign,
  textLayer,
  wrapText,
  type BrandColors,
  type DesignData,
  type DesignLayer,
  type TemplateId,
} from "@/lib/studio/model";
import { deleteDesignAction, saveDesignAction } from "@/lib/studio/actions";
import { cn } from "@/lib/utils";

type SavedDesign = {
  id: string;
  name: string;
  width: number;
  height: number;
  data: unknown;
};

const SIZES = [
  { label: "Square", width: 1080, height: 1080 },
  { label: "Portrait", width: 1080, height: 1350 },
  { label: "Story", width: 1080, height: 1920 },
];

const FONTS = ["Inter", "Georgia", "Arial", "Trebuchet MS", "Courier New", "Times New Roman"];

/** Draws a design onto any 2D context. Used for the live canvas and PNG export. */
function renderDesign(options: {
  ctx: CanvasRenderingContext2D;
  design: DesignData;
  width: number;
  height: number;
  selectedId: string | null;
  images: Map<string, HTMLImageElement>;
  onImageLoad?: () => void;
}) {
  const { ctx, design, width, height, selectedId, images, onImageLoad } = options;

  if (design.useGradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, design.background);
    gradient.addColorStop(1, design.backgroundSecondary);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = design.background;
  }
  ctx.fillRect(0, 0, width, height);

  for (const layer of design.layers) {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;

    if (layer.type === "shape") {
      ctx.fillStyle = layer.color ?? "#ffffff";
      ctx.beginPath();
      if (layer.shape === "circle") {
        ctx.ellipse(layer.x + layer.width / 2, layer.y + layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
      } else if (layer.shape === "line") {
        ctx.roundRect(layer.x, layer.y, layer.width, Math.max(2, layer.height), layer.radius ?? layer.height / 2);
      } else {
        ctx.roundRect(layer.x, layer.y, layer.width, layer.height, layer.radius ?? 0);
      }
      ctx.fill();
    }

    if (layer.type === "image" && layer.src) {
      let image = images.get(layer.src);
      if (!image) {
        image = new Image();
        image.onload = () => onImageLoad?.();
        image.src = layer.src;
        images.set(layer.src, image);
      }
      if (image.complete && image.naturalWidth > 0) {
        const scale = Math.max(layer.width / image.naturalWidth, layer.height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        ctx.beginPath();
        ctx.roundRect(layer.x, layer.y, layer.width, layer.height, layer.radius ?? 0);
        ctx.clip();
        ctx.drawImage(
          image,
          layer.x + (layer.width - drawWidth) / 2,
          layer.y + (layer.height - drawHeight) / 2,
          drawWidth,
          drawHeight,
        );
      }
    }

    if (layer.type === "text") {
      const fontSize = layer.fontSize ?? 64;
      ctx.font = `${layer.fontWeight ?? 700} ${fontSize}px "${layer.fontFamily ?? "Inter"}", system-ui, sans-serif`;
      ctx.fillStyle = layer.color ?? "#ffffff";
      ctx.textBaseline = "top";
      const lines = wrapText(ctx, layer.text ?? "", layer.width);
      const lineHeight = fontSize * 1.18;
      lines.forEach((line, index) => {
        const y = layer.y + index * lineHeight;
        if (layer.align === "center") {
          ctx.textAlign = "center";
          ctx.fillText(line, layer.x + layer.width / 2, y);
        } else if (layer.align === "right") {
          ctx.textAlign = "right";
          ctx.fillText(line, layer.x + layer.width, y);
        } else {
          ctx.textAlign = "left";
          ctx.fillText(line, layer.x, y);
        }
      });
    }

    ctx.restore();
  }

  const selected = design.layers.find((layer) => layer.id === selectedId);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = "rgba(99, 102, 241, 0.95)";
    ctx.lineWidth = Math.max(3, width / 300);
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(selected.x - 2, selected.y - 2, selected.width + 4, selected.height + 4);
    ctx.restore();
  }
}

export function PosterStudio({
  businessId,
  businessName,
  brand,
  savedDesigns,
}: {
  businessId: string;
  businessName: string;
  brand: BrandColors;
  savedDesigns: SavedDesign[];
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [, setImageVersion] = useState(0);

  const [templateId, setTemplateId] = useState<TemplateId>("offer");
  const [design, setDesign] = useState<DesignData>(() => buildTemplate("offer", businessName, brand));
  const [size, setSize] = useState({ width: 1080, height: 1350 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [designName, setDesignName] = useState(`${businessName} poster`);
  const [designId, setDesignId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = design.layers.find((layer) => layer.id === selectedId) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size.width;
    canvas.height = size.height;
    renderDesign({
      ctx,
      design,
      width: size.width,
      height: size.height,
      selectedId,
      images: imagesRef.current,
      onImageLoad: () => setImageVersion((version) => version + 1),
    });
  }, [design, size, selectedId]);

  function applyTemplate(id: TemplateId) {
    const next = buildTemplate(id, businessName, brand);
    setTemplateId(id);
    setDesign(next);
    setSelectedId(next.layers[0]?.id ?? null);
    setDesignId(null);
    setStatus(null);
  }

  function updateLayer(id: string, patch: Partial<DesignLayer>) {
    setDesign((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    }));
  }

  function removeLayer(id: string) {
    setDesign((current) => ({ ...current, layers: current.layers.filter((layer) => layer.id !== id) }));
    setSelectedId(null);
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setDesign((current) => {
      const index = current.layers.findIndex((layer) => layer.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.layers.length) return current;
      const layers = [...current.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { ...current, layers };
    });
  }

  function addText() {
    const layer = textLayer({
      x: 90,
      y: Math.min(520, size.height - 260),
      width: size.width - 180,
      text: "New text",
      color: "#ffffff",
      fontSize: 72,
      fontFamily: brand.headingFont || "Inter",
    });
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(layer.id);
  }

  function addShape(shape: "rect" | "circle" | "line") {
    const layer: DesignLayer = {
      id: newLayerId("shape"),
      type: "shape",
      shape,
      x: Math.round(size.width / 2 - 120),
      y: Math.round(size.height / 2 - 120),
      width: shape === "line" ? 300 : 240,
      height: shape === "line" ? 8 : 240,
      color: brand.accent || "#f59e0b",
      radius: 24,
      opacity: 1,
    };
    setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelectedId(layer.id);
  }

  function uploadImage(file: File) {
    if (file.size > 2_500_000) {
      setStatus({ tone: "error", message: "Choose an image under 2.5 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (!src) return;
      const layer: DesignLayer = {
        id: newLayerId("image"),
        type: "image",
        x: Math.round(size.width / 2 - 300),
        y: Math.round(size.height / 2 - 300),
        width: 600,
        height: 600,
        src,
        opacity: 1,
      };
      setDesign((current) => ({ ...current, layers: [...current.layers, layer] }));
      setSelectedId(layer.id);
    };
    reader.readAsDataURL(file);
  }

  function loadDesign(saved: SavedDesign) {
    const fallback = buildTemplate("blank", businessName, brand);
    const data = normalizeDesign(saved.data, fallback);
    setDesign(data);
    setSize({ width: saved.width, height: saved.height });
    setDesignName(saved.name);
    setDesignId(saved.id);
    setSelectedId(data.layers[0]?.id ?? null);
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    const result = await saveDesignAction({
      businessId,
      designId,
      name: designName,
      width: size.width,
      height: size.height,
      data: design,
    });
    setBusy(false);
    setStatus({ tone: result.ok ? "ok" : "error", message: result.message });
    if (result.ok && result.id) {
      setDesignId(result.id);
      router.refresh();
    }
  }

  async function removeSaved(id: string) {
    const result = await deleteDesignAction({ businessId, designId: id });
    setStatus({ tone: result.ok ? "ok" : "error", message: result.message });
    if (result.ok) {
      if (designId === id) setDesignId(null);
      router.refresh();
    }
  }

  function exportPng() {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderDesign({
      ctx,
      design,
      width: size.width,
      height: size.height,
      selectedId: null,
      images: imagesRef.current,
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${designName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "bookedout-design"}.png`;
    link.click();
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event);
    const hit = [...design.layers]
      .reverse()
      .find(
        (layer) =>
          point.x >= layer.x &&
          point.x <= layer.x + layer.width &&
          point.y >= layer.y &&
          point.y <= layer.y + layer.height,
      );

    if (!hit) {
      setSelectedId(null);
      return;
    }

    setSelectedId(hit.id);
    dragRef.current = { id: hit.id, offsetX: point.x - hit.x, offsetY: point.y - hit.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const point = pointFromEvent(event);
    updateLayer(dragRef.current.id, {
      x: Math.round(point.x - dragRef.current.offsetX),
      y: Math.round(point.y - dragRef.current.offsetY),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[520px]">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="w-full touch-none rounded-xl bg-white shadow-lg"
              style={{ aspectRatio: `${size.width} / ${size.height}` }}
              aria-label="Poster canvas. Drag elements to move them."
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Drag anything on the poster to move it. Select a layer to edit it on the right.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <button type="button" onClick={addText} className="btn-secondary !py-2">+ Text</button>
          <button type="button" onClick={() => addShape("rect")} className="btn-secondary !py-2">+ Rectangle</button>
          <button type="button" onClick={() => addShape("circle")} className="btn-secondary !py-2">+ Circle</button>
          <button type="button" onClick={() => addShape("line")} className="btn-secondary !py-2">+ Line</button>
          <label className="btn-secondary cursor-pointer !py-2">
            + Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadImage(file);
                event.target.value = "";
              }}
            />
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {SIZES.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setSize({ width: option.width, height: option.height })}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                  size.width === option.width && size.height === option.height
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Templates</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                title={template.description}
                className={cn(
                  "rounded-xl border p-3 text-left text-xs font-medium transition",
                  templateId === template.id
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-slate-200 text-slate-700 hover:border-slate-300",
                )}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Design name</p>
          <div className="mt-1 flex gap-2">
            <input value={designName} onChange={(event) => setDesignName(event.target.value)} className="field" />
            <button type="button" onClick={save} disabled={busy} className="btn-primary !px-3">
              {busy ? "…" : designId ? "Update" : "Save"}
            </button>
          </div>
          {status && (
            <p className={cn("mt-2 text-xs", status.tone === "ok" ? "text-emerald-700" : "text-red-600")}>
              {status.message}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={exportPng} className="btn-secondary !py-2 text-xs">Download PNG</button>
            <button
              type="button"
              onClick={() => {
                setDesign((current) => ({ ...current, layers: [] }));
                setSelectedId(null);
              }}
              className="btn-secondary !py-2 text-xs"
            >
              Clear layers
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Background</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-600">
              Colour
              <input
                type="color"
                value={design.background}
                onChange={(event) => setDesign((current) => ({ ...current, background: event.target.value }))}
                className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-300"
              />
            </label>
            <label className="text-xs text-slate-600">
              Second colour
              <input
                type="color"
                value={design.backgroundSecondary}
                onChange={(event) => setDesign((current) => ({ ...current, backgroundSecondary: event.target.value }))}
                className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-300"
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={design.useGradient}
              onChange={(event) => setDesign((current) => ({ ...current, useGradient: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Gradient background
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Layers</p>
            <span className="text-xs text-slate-500">{design.layers.length}</span>
          </div>
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
            {[...design.layers].reverse().map((layer) => (
              <li key={layer.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(layer.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                    selectedId === layer.id ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span className="w-12 shrink-0 text-slate-400 capitalize">{layer.type}</span>
                  <span className="truncate">
                    {layer.type === "text" ? layer.text?.slice(0, 30) : layer.shape ?? "image"}
                  </span>
                </button>
              </li>
            ))}
            {design.layers.length === 0 && <li className="px-2 py-3 text-xs text-slate-500">No layers yet.</li>}
          </ul>
        </div>

        {selected ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 capitalize">Selected {selected.type}</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveLayer(selected.id, 1)} className="btn-ghost" title="Bring forward">↑</button>
                <button type="button" onClick={() => moveLayer(selected.id, -1)} className="btn-ghost" title="Send backward">↓</button>
                <button type="button" onClick={() => removeLayer(selected.id)} className="btn-danger">Delete</button>
              </div>
            </div>

            {selected.type === "text" && (
              <>
                <div>
                  <label className="label text-xs">Text</label>
                  <textarea
                    value={selected.text ?? ""}
                    onChange={(event) => updateLayer(selected.id, { text: event.target.value })}
                    rows={3}
                    className="field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Size</label>
                    <input
                      type="number"
                      min={10}
                      max={400}
                      value={selected.fontSize ?? 64}
                      onChange={(event) => updateLayer(selected.id, { fontSize: Number(event.target.value) })}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Weight</label>
                    <select
                      value={selected.fontWeight ?? 700}
                      onChange={(event) => updateLayer(selected.id, { fontWeight: Number(event.target.value) })}
                      className="field"
                    >
                      <option value={400}>Regular</option>
                      <option value={500}>Medium</option>
                      <option value={600}>Semibold</option>
                      <option value={700}>Bold</option>
                      <option value={800}>Extra bold</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Font</label>
                    <select
                      value={selected.fontFamily ?? "Inter"}
                      onChange={(event) => updateLayer(selected.id, { fontFamily: event.target.value })}
                      className="field"
                    >
                      {FONTS.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Align</label>
                    <select
                      value={selected.align ?? "left"}
                      onChange={(event) =>
                        updateLayer(selected.id, { align: event.target.value as "left" | "center" | "right" })
                      }
                      className="field"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Colour</label>
                  <input
                    type="color"
                    value={selected.color ?? "#ffffff"}
                    onChange={(event) => updateLayer(selected.id, { color: event.target.value })}
                    className="h-9 w-full cursor-pointer rounded border border-slate-300"
                  />
                </div>
              </>
            )}

            {selected.type === "shape" && (
              <>
                <div>
                  <label className="label text-xs">Colour</label>
                  <input
                    type="color"
                    value={selected.color ?? "#f59e0b"}
                    onChange={(event) => updateLayer(selected.id, { color: event.target.value })}
                    className="h-9 w-full cursor-pointer rounded border border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Width</label>
                    <input
                      type="number"
                      value={selected.width}
                      onChange={(event) => updateLayer(selected.id, { width: Number(event.target.value) })}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Height</label>
                    <input
                      type="number"
                      value={selected.height}
                      onChange={(event) => updateLayer(selected.id, { height: Number(event.target.value) })}
                      className="field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Corner radius</label>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={selected.radius ?? 0}
                    onChange={(event) => updateLayer(selected.id, { radius: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {selected.type === "image" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Width</label>
                  <input
                    type="number"
                    value={selected.width}
                    onChange={(event) => updateLayer(selected.id, { width: Number(event.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label text-xs">Height</label>
                  <input
                    type="number"
                    value={selected.height}
                    onChange={(event) => updateLayer(selected.id, { height: Number(event.target.value) })}
                    className="field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label text-xs">Corner radius</label>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    value={selected.radius ?? 0}
                    onChange={(event) => updateLayer(selected.id, { radius: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label text-xs">Opacity</label>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round((selected.opacity ?? 1) * 100)}
                onChange={(event) => updateLayer(selected.id, { opacity: Number(event.target.value) / 100 })}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">X</label>
                <input
                  type="number"
                  value={selected.x}
                  onChange={(event) => updateLayer(selected.id, { x: Number(event.target.value) })}
                  className="field"
                />
              </div>
              <div>
                <label className="label text-xs">Y</label>
                <input
                  type="number"
                  value={selected.y}
                  onChange={(event) => updateLayer(selected.id, { y: Number(event.target.value) })}
                  className="field"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
            Click an element on the poster, or add a new one, to edit its text, colour and position.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Saved designs</p>
          {savedDesigns.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Nothing saved yet. Your poster is stored against this business.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {savedDesigns.map((saved) => (
                <li key={saved.id} className="flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => loadDesign(saved)}
                    className="min-w-0 flex-1 truncate text-left font-medium text-brand-700 hover:underline"
                  >
                    {saved.name}
                  </button>
                  <span className="text-slate-400">{saved.width}×{saved.height}</span>
                  <button type="button" onClick={() => removeSaved(saved.id)} className="btn-danger">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
