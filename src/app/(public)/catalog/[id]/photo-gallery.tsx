"use client";

import { useState } from "react";

const PLACEHOLDER_STYLE = {
  backgroundImage: "repeating-linear-gradient(45deg,#1E1E1E 0,#1E1E1E 12px,#232323 12px,#232323 24px)",
};

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) {
    return (
      <div
        className="flex aspect-[4/3] items-center justify-center border border-white/10"
        style={PLACEHOLDER_STYLE}
      >
        <span className="font-mono text-[13px] text-[#5A5A5A]">no photo yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden border border-white/10">
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
