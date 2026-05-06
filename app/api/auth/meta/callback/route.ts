import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/meta/callback — Meta OAuth callback
 * Exchanges authorization code for access token, then lists pages/phone numbers
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      console.error("[MetaCallback] User denied access:", errorParam);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=meta_denied`
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=missing_params`
      );
    }

    // Decode state
    let state: { chatbotId: string; platform: string; userId: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=invalid_state`
      );
    }

    const { chatbotId, platform, userId } = state;

    // Exchange code for access token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=meta_not_configured`
      );
    }

    const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      console.error("[MetaCallback] Token exchange failed:", err);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token
    const longLivedUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = longLivedResponse.ok ? await longLivedResponse.json() : null;
    const accessToken = longLivedData?.access_token || shortLivedToken;

    // Determine channel type
    let channelType: string;
    switch (platform) {
      case "whatsapp": channelType = "WHATSAPP"; break;
      case "instagram": channelType = "INSTAGRAM"; break;
      case "facebook": channelType = "FACEBOOK"; break;
      default: channelType = "FACEBOOK";
    }

    if (platform === "whatsapp") {
      // For WhatsApp: Get WhatsApp Business Accounts and Phone Numbers
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v22.0/me/businesses?access_token=${accessToken}`
      );
      const wabaData = wabaResponse.ok ? await wabaResponse.json() : { data: [] };

      // Store the token temporarily — user will finalize by selecting phone number
      const existingChannel = await prisma.channel.findFirst({
        where: { chatbotId, type: channelType as any },
      });

      if (existingChannel) {
        await prisma.channel.update({
          where: { id: existingChannel.id },
          data: {
            config: { accessToken, businesses: wabaData.data || [], platform },
            status: "PENDING",
            name: `WhatsApp (Pending Setup)`,
          },
        });
      } else {
        await prisma.channel.create({
          data: {
            chatbotId,
            type: channelType as any,
            name: `WhatsApp (Pending Setup)`,
            config: { accessToken, businesses: wabaData.data || [], platform },
            status: "PENDING",
          },
        });
      }
    } else {
      // For Facebook/Instagram: Get pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v22.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = pagesResponse.ok ? await pagesResponse.json() : { data: [] };

      const existingChannel = await prisma.channel.findFirst({
        where: { chatbotId, type: channelType as any },
      });

      if (existingChannel) {
        await prisma.channel.update({
          where: { id: existingChannel.id },
          data: {
            config: { accessToken, pages: pagesData.data || [], platform },
            status: "PENDING",
            name: `${platform === "instagram" ? "Instagram" : "Messenger"} (Pending Setup)`,
          },
        });
      } else {
        await prisma.channel.create({
          data: {
            chatbotId,
            type: channelType as any,
            name: `${platform === "instagram" ? "Instagram" : "Messenger"} (Pending Setup)`,
            config: { accessToken, pages: pagesData.data || [], platform },
            status: "PENDING",
          },
        });
      }
    }

    // Redirect back to settings page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&meta_connected=true`
    );
  } catch (error) {
    console.error("[MetaCallback] Error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=callback_failed`
    );
  }
}
