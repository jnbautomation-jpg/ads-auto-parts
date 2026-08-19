"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

const GREETING =
  "Hi — I can check what we have in stock for your vehicle. What are you looking for?";

// The bottom-right assistant. Rendered only when the server says a key is
// configured, so it never appears as a button that does nothing.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes, which is what people expect of an overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I couldn't reach the shop just now — please call (407) 743-4644." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Parts assistant"
          className="fixed bottom-[84px] right-4 z-50 flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col border border-white/12 bg-[#111] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1A1A1A] px-4 py-3">
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold tracking-[0.06em] text-white">
                Parts assistant
              </span>
              <span className="font-[family-name:var(--font-barlow)] text-[11px] text-[#8A8A8A]">
                Checks live stock · English &amp; Español
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1 text-[20px] leading-none text-[#8A8A8A] transition-colors hover:text-white"
            >
              ×
            </button>
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 font-[family-name:var(--font-barlow)] text-[14px] leading-[1.5] ${
                  m.role === "user"
                    ? "self-end bg-[#E31E24] text-white"
                    : "self-start border border-white/10 bg-[#1A1A1A] text-[#E4E4E4]"
                }`}
              >
                {/* Plain text on purpose — the model's output is never
                    rendered as HTML. */}
                {m.text}
              </div>
            ))}
            {pending ? (
              <div className="self-start border border-white/10 bg-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-barlow)] text-[14px] text-[#8A8A8A]">
                Checking the catalog…
              </div>
            ) : null}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Door for a 2021 RAV4?"
              className="min-h-[44px] flex-1 border border-white/12 bg-[#0A0A0A] px-3 font-[family-name:var(--font-barlow)] text-[15px] text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="min-h-[44px] shrink-0 bg-[#E31E24] px-4 font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-white transition-colors hover:bg-[#ff3a40] disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close parts assistant" : "Open parts assistant"}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#E31E24] text-white shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 active:scale-95"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}
