export function BrandLogo({ size = "sm" }: { size?: "sm" | "md" }) {
  const bar = size === "sm" ? "h-[18px] w-[7px]" : "h-[22px] w-[9px] lg:h-[28px] lg:w-[11px]";
  const text = size === "sm" ? "text-[18px]" : "text-[22px] lg:text-[28px]";
  return (
    <div className="flex items-center gap-2 lg:gap-2.5">
      <div className={`${bar} -skew-x-12 rounded-sm bg-[var(--accent)]`} />
      <div className="flex flex-col items-center leading-none">
        <div className={`font-[family-name:var(--font-oswald)] font-bold tracking-[0.14em] ${text}`}>ADS</div>
        {size === "md" ? (
          <div className="mt-0.5 font-[family-name:var(--font-barlow-condensed)] text-[6.5px] font-semibold tracking-[0.28em] text-[var(--ink-on-band-muted)] lg:text-[8px] lg:tracking-[0.3em]">
            AUTO DOOR STORE · ORLANDO
          </div>
        ) : null}
      </div>
      <div className={`${bar} skew-x-12 rounded-sm bg-[var(--accent)]`} />
    </div>
  );
}
