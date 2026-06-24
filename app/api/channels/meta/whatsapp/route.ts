import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppMessage, sendWhatsAppMessage, verifyMetaWebhook } from "@/lib/channels/meta";
import { performRAGSearch, generateRAGResponse, logTokenUsage, LLMModel } from "@/lib/ai";

// Meta Webhook Verification (Handshake)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN || "jcaesar_verify_token";
  const result = verifyMetaWebhook(mode, token, challenge, verifyToken);

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Meta Webhook Message Handling
export async function POST() {
  // DEPRECATED - Webhook processing moved to /api/webhooks/meta
  return NextResponse.json({ ok: true });
}
