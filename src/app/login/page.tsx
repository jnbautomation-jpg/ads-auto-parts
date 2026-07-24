import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      {/* Carbon-fiber texture, slowly drifting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: "conic-gradient(from 45deg, #101010 25%, #0c0c0c 0 50%, #101010 0 75%, #0c0c0c 0)",
          backgroundSize: "14px 14px",
          animation: "drift 70s linear infinite alternate",
        }}
      />
      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(90% 60% at 50% 45%, transparent 30%, #0A0A0A 90%)" }}
      />
      {/* Fine grain noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Light sweep */}
      <div
        className="pointer-events-none absolute inset-y-0 w-[34%] lg:w-[24%]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(227,30,36,0.045), transparent)",
          animation: "sweep 11s linear infinite",
        }}
      />

      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-6 lg:gap-7">
        <div style={{ animation: "rise 0.5s 0.05s both" }}>
          <BrandLogo size="md" />
        </div>

        <div
          className="w-full border border-white/8 border-t-2 border-t-[#E31E24] bg-[#1A1A1A] p-6 lg:p-8"
          style={{ animation: "rise 0.6s 0.25s both, glow 2s ease-out 0.8s both" }}
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="font-[family-name:var(--font-oswald)] text-[19px] font-semibold tracking-[0.2em] lg:text-[20px]">
              STAFF SIGN IN
            </h1>
            <p className="font-[family-name:var(--font-barlow)] text-[13px] text-[#888]">
              For ADS warehouse and office staff only.
            </p>
          </div>
          <LoginForm next={next ?? "/dashboard"} />
        </div>

        <Link
          href="/"
          className="font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
          style={{ animation: "rise 0.6s 0.45s both" }}
        >
          ← BACK TO SITE
        </Link>
      </div>
    </div>
  );
}
