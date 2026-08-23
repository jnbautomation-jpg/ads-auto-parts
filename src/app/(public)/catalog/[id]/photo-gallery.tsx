"use client";

import { useState } from "react";
import { getPartTypeImage } from "@/lib/part-images";

const PLACEHOLDER_STYLE = {
  backgroundImage: "repeating-linear-gradient(45deg,#E4E7EA 0,#E4E7EA 12px,#DCE0E4 12px,#DCE0E4 24px)",
};

export function PhotoGallery({ photos, alt, partType }: { photos: string[]; alt: string; partType: string }) {
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) {
    const defaultImage = getPartTypeImage(partType);
    return (
      <div
        className="flex aspect-[4/3] items-center justify-center border border-[var(--line)] bg-[#141414]"
        style={defaultImage ? undefined : PLACEHOLDER_STYLE}
      >
        {defaultImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={defaultImage} alt={alt} className="h-[70%] w-[70%] object-contain opacity-90" />
        ) : (
          <span className="font-mono text-[13px] text-[var(--ink-faint)]">no photo yet</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden border border-[var(--line)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[selected]} alt={alt} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button
              key={photo}
              type="button"
              onClick={() => setSelected(i)}
              className="aspect-[4/3] overflow-hidden border"
              style={{ borderColor: i === selected ? "#E31E24" : "#2A2A2A" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
