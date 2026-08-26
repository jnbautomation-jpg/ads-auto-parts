import Script from "next/script";
import { GOOGLE_ADS_ID, META_PIXEL_ID } from "@/lib/site";

// Google Ads and Meta Pixel tags for the public site.
//
// Both were on the old Wix site and neither was carried across, so two live ad
// campaigns have been running against a site that reports zero conversions.
// The marketing director could see spend but not results.
//
// Mounted in the (public) layout only. Staff screens are not advertising
// surfaces, and tagging them would put warehouse activity into the same
// conversion data the ad campaigns are optimised against.
//
// `afterInteractive` rather than `beforeInteractive`: these are measurement,
// not functionality, and they must never sit in front of the page rendering
// for a customer on a phone in a body shop.
//
// An empty ID renders nothing at all, so switching off tracking is a one-line
// edit in site.ts rather than surgery here.
export function SiteAnalytics() {
  const google = GOOGLE_ADS_ID.trim();
  const meta = META_PIXEL_ID.trim();
  if (!google && !meta) return null;

  return (
    <>
      {google ? (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${google}`}
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${google}');`}
          </Script>
        </>
      ) : null}

      {meta ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${meta}');
fbq('track','PageView');`}
          </Script>
          {/* Fires for visitors with JavaScript disabled, which the pixel
              otherwise misses entirely. */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
