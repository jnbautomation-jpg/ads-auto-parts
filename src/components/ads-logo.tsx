// The photographed ADS badge (black background, red/white mark) — only ever
// on a dark surface, the black background boxes visibly on light ones. Public
// site + login page only; admin keeps its own light-theme treatment.
export function AdsLogoImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/ads-logo.jpg" alt="ADS Auto Door Store — Orlando" className={className} />
  );
}
