"use client";

import { useState } from "react";

/**
 * Picks an image and stores it as a data URL in a hidden form field, so the
 * server action can persist it without a separate storage service.
 */
export function ImageInput({
  name,
  defaultValue,
  label = "Logo",
  maxKb = 300,
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
  maxKb?: number;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            "None"
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input type="hidden" name={name} value={value} />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setError(null);
              if (file.size > maxKb * 1024) {
                setError(`Choose an image under ${maxKb} KB.`);
                event.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setValue(String(reader.result ?? ""));
              reader.readAsDataURL(file);
            }}
          />
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-slate-500">PNG, JPG or WebP · under {maxKb} KB</p>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
