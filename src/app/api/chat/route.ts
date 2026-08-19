import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerTier } from "@/lib/customer-auth";
import { ORG_SLUG, PHONE_DISPLAY } from "@/lib/site";
import {
  CATALOG_TOOL,
  CHAT_LIMITS,
  CHAT_MODEL,
  buildSystemPrompt,
  isChatConfigured,
  searchCatalog,
  type CatalogSearchArgs,
} from "@/lib/chat";

const COOKIE = "ads_chat";

/** Fallback used whenever the assistant can't run — never a dead end. */
const HANDOFF = `I can't answer that right now — please call us on ${PHONE_DISPLAY} and we'll sort it out.`;

export async function POST(request: Request) {
  // No key configured: the widget is hidden, but the endpoint still has to
  // answer sensibly if it's reached directly.
  if (!isChatConfigured()) {
    return NextResponse.json({ reply: HANDOFF, unavailable: true }, { status: 200 });
  }

  let message = "";
  try {
    const body = (await request.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!message) return NextResponse.json({ error: "Say something first." }, { status: 400 });
  if (message.length > CHAT_LIMITS.maxMessageLength) {
    return NextResponse.json(
      { error: `Please keep it under ${CHAT_LIMITS.maxMessageLength} characters.` },
      { status: 400 },
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });
  if (!organization) {
    return NextResponse.json({ reply: HANDOFF, unavailable: true }, { status: 200 });
  }

  // Anonymous, httpOnly session key. Identifies a browser for history and
  // rate limiting without collecting anything about the person.
  const jar = await cookies();
  let sessionKey = jar.get(COOKIE)?.value;
  if (!sessionKey || sessionKey.length < 16) {
    sessionKey = crypto.randomUUID();
    jar.set(COOKIE, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  const session = await prisma.chatSession.upsert({
    where: { sessionKey },
    create: { organizationId: organization.id, sessionKey },
    update: {},
    select: { id: true },
  });

  // Rate limit from the database, not memory — serverless instances share no
  // state, so an in-process counter would reset constantly and cap nothing.
  const since = new Date(Date.now() - CHAT_LIMITS.windowMs);
  const recentCount = await prisma.chatMessage.count({
    where: { chatSessionId: session.id, role: "USER", createdAt: { gte: since } },
  });
  if (recentCount >= CHAT_LIMITS.perSession) {
    return NextResponse.json(
      {
        reply: `That's a lot of questions for one session — give us a call on ${PHONE_DISPLAY} and we'll help you properly.`,
        rateLimited: true,
      },
      { status: 200 },
    );
  }

  const tier = await getViewerTier();

  const history = await prisma.chatMessage.findMany({
    where: { chatSessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: CHAT_LIMITS.historyTurns,
    select: { role: true, content: true },
  });

  const messages: Anthropic.MessageParam[] = history
    .reverse()
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));
  messages.push({ role: "user", content: message });

  await prisma.chatMessage.create({
    data: { chatSessionId: session.id, role: "USER", content: message },
  });

  const client = new Anthropic();

  try {
    let response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(tier),
      tools: [CATALOG_TOOL],
      messages,
    });

    // Tool loop. Bounded rather than while(true): a runaway loop here costs
    // real money, and no legitimate question needs more than a few searches.
    for (let turn = 0; turn < 4 && response.stop_reason === "tool_use"; turn++) {
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      messages.push({ role: "assistant", content: response.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        if (use.name !== "search_catalog") {
          results.push({ type: "tool_result", tool_use_id: use.id, content: "Unknown tool.", is_error: true });
          continue;
        }
        try {
          // Tool inputs are parsed JSON from the model — never string-matched.
          const args = use.input as CatalogSearchArgs;
          const result = await searchCatalog(organization.id, args, tier);
          results.push({ type: "tool_result", tool_use_id: use.id, content: result });
        } catch {
          results.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: "The catalog lookup failed.",
            is_error: true,
          });
        }
      }

      // All tool results go back in ONE user message — splitting them teaches
      // the model to stop making parallel calls.
      messages.push({ role: "user", content: results });

      response = await client.messages.create({
        model: CHAT_MODEL,
        max_tokens: 1024,
        system: buildSystemPrompt(tier),
        tools: [CATALOG_TOOL],
        messages,
      });
    }

    const reply =
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim() || HANDOFF;

    await prisma.chatMessage.create({
      data: { chatSessionId: session.id, role: "ASSISTANT", content: reply },
    });

    return NextResponse.json({ reply });
  } catch (error) {
    // Typed SDK errors, most specific first. A customer never sees the
    // detail — they get a phone number.
    if (error instanceof Anthropic.RateLimitError) {
      console.error("Chat rate limited by Anthropic");
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error("Chat misconfigured: ANTHROPIC_API_KEY is invalid");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Chat API error ${error.status}:`, error.message);
    } else {
      console.error("Chat failed:", error);
    }
    return NextResponse.json({ reply: HANDOFF, unavailable: true }, { status: 200 });
  }
}
