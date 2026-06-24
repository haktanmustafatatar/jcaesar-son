import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/meta/whatsapp/callback — Handles WhatsApp OAuth callback
 * Exchanges the auth code for a long‑lived token, retrieves the WhatsApp Business
 * Account and phone number, and creates/updates a WhatsApp channel in Prisma.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      console.error("[WHATSAPP_CALLBACK] User denied access:", errorParam);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=meta_denied`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=missing_params`
      );
    }

    // Decode state (contains chatbotId and userId)
    let state: { chatbotId: string; userId: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=invalid_state`
      );
    }

    const { chatbotId, userId } = state;

    const META_APP_ID = process.env.META_APP_ID;
    const META_APP_SECRET = process.env.META_APP_SECRET;
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/whatsapp/callback`;

    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=meta_not_configured`
      );
    }

    // Exchange code for short‑lived token
    const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenResp = await fetch(tokenUrl.toString());
    if (!tokenResp.ok) {
      const err = await tokenResp.json();
      console.error("[WHATSAPP_CALLBACK] Token exchange failed:", err);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=token_exchange_failed`
      );
    }
    const tokenData = await tokenResp.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange for long‑lived token
    const longLivedUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", META_APP_ID);
    longLivedUrl.searchParams.set("client_secret", META_APP_SECRET);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedResp = await fetch(longLivedUrl.toString());
    const longLivedData = (await longLivedResp.json()) as any;
    const accessToken = longLivedData.access_token || shortLivedToken;

    // Retrieve WhatsApp Business Accounts associated with the user
    const waAccountsResp = await fetch(
      `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?access_token=${accessToken}`
    );
    const waAccountsData = (await waAccountsResp.json()) as any;
    if (waAccountsData.error) {
      console.error("[WHATSAPP_CALLBACK] WA accounts fetch error:", waAccountsData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=wa_accounts_failed`
      );
    }

    const waAccount = waAccountsData.data?.[0];
    if (!waAccount) {
      console.error("[WHATSAPP_CALLBACK] No WhatsApp Business Account found");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=no_wa_account`
      );
    }

    // Fetch phone numbers for the selected WA Business Account
    const phoneResp = await fetch(
      `https://graph.facebook.com/v22.0/${waAccount.id}/whatsapp_business_phone_numbers?access_token=${accessToken}`
    );
    const phoneData = (await phoneResp.json()) as any;
    const phoneNumberObj = phoneData.data?.[0];
    const phoneNumberId = phoneNumberObj?.id || "";
    const phoneNumber = phoneNumberObj?.display_phone_number || "";

    if (!phoneNumberId) {
      console.error("[WHATSAPP_CALLBACK] phoneNumberId alınamadı, WA hesabı bağlanamıyor.");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/integrations?error=no_phone_number_id`
      );
    }

    // Upsert channel in Prisma
    const existing = await prisma.channel.findFirst({
      where: { chatbotId, type: "WHATSAPP" },
    });

    const config = {
      accessToken,
      waBusinessAccountId: waAccount.id,
      phoneNumberId,
      phoneNumber,
    };

    if (existing) {
      await prisma.channel.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          name: `WhatsApp: ${phoneNumber || "Business"}`,
          phoneNumberId,
          config,
        },
      });
    } else {
      await prisma.channel.create({
        data: {
          chatbotId,
          type: "WHATSAPP",
          status: "CONNECTED",
          name: `WhatsApp: ${phoneNumber || "Business"}`,
          phoneNumberId,
          config,
        },
      });
    }

    // Success – redirect back to the chatbot settings UI
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/integrations?meta_connected=true`
    );
  } catch (err) {
    console.error("[WHATSAPP_CALLBACK] Unexpected error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=callback_failed`
    );
  }
}
