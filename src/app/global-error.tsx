"use client"; // Error boundaries must be Client Components.

// Last line of defence: replaces the root layout entirely, so it must render
// its own <html> and <body>. This is what shows if the root layout or an
// admin layout throws — including a failure inside requireAuthContext(),
// which (admin)/error.tsx cannot catch.
//
// Deliberately English in both languages, and lang="en" below is deliberate
// too: this replaces the root layout, so it has no request headers and no
// router to ask which language the visitor was reading. Guessing wrong here
// would mean a Spanish page whose <html lang> disagrees with its text. The
// phone number is the part that matters on this page and it is the same in
// any language.
//
// Styles are inline rather than Tailwind classes: if the failure happened
// before the stylesheet was applied, class names would render unstyled text
// on a white page. Metadata exports are not supported here, so the title is
// set with React's <title>.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <title>Something went wrong — ADS Auto Door Store</title>
        <main style={{ maxWidth: "480px" }}>
          <h1 style={{ fontSize: "28px", margin: "0 0 12px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#B4B4B4", lineHeight: 1.55, margin: "0 0 20px" }}>
            The site hit an unexpected error. Please try again, or call the shop at{" "}
            <a href="tel:4077434644" style={{ color: "#ffffff" }}>
              (407) 743-4644
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              minHeight: "48px",
              padding: "0 20px",
              backgroundColor: "#E31E24",
              color: "#ffffff",
              border: "none",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ color: "#8A8A8A", fontSize: "12px", marginTop: "20px" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
