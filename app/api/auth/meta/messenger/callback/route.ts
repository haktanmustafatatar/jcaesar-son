import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/meta/messenger/callback — Handles Facebook Messenger OAuth callback
 * Exchanges the authorization code for an access token, retrieves the user's Pages,
 * and creates/updates a Messenger channel in the database.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      console.error("[MESSENGER_CALLBACK] User denied access:", errorParam);
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
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/messenger/callback`;

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
      console.error("[MESSENGER_CALLBACK] Token exchange failed:", err);
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

    // Retrieve pages the user manages
    const pagesResp = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = (await pagesResp.json()) as any;
    if (pagesData.error) {
      console.error("[MESSENGER_CALLBACK] Pages fetch error:", pagesData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=pages_fetch_failed`
      );
    }

    // Pick the first page (could be refined later)
    const page = pagesData.data?.[0];
    if (!page) {
      console.error("[MESSENGER_CALLBACK] No Facebook Page found for user");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?error=no_page`
      );
    }

    const pageId = page.id;
    const pageName = page.name || "Facebook Page";
    const pageAccessToken = page.access_token || accessToken;

    // Subscribe the Page to the App for Messenger messages
    try {
      const subscribeUrl = `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${pageAccessToken}`;
      const subRes = await fetch(subscribeUrl, { method: "POST" });
      const subData = await subRes.json();
      console.log("[MESSENGER_CALLBACK] Subscribed page to app:", subData);
    } catch (subErr) {
      console.error("[MESSENGER_CALLBACK] Failed to subscribe page to app:", subErr);
    }

    // Create Bird connector for Facebook Messenger
    let birdChannelId = pageId; // fallback
    try {
      const birdApiKey = process.env.BIRD_API_KEY;
      const birdWorkspaceId = process.env.BIRD_WORKSPACE_ID;
      if (birdApiKey && birdWorkspaceId) {
        const birdRes = await fetch(
          `https://api.bird.com/workspaces/${birdWorkspaceId}/connectors`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `AccessKey ${birdApiKey}`,
            },
            body: JSON.stringify({
              connectorTemplateRef: "facebook:1",
              name: `Messenger: ${pageName}`,
              arguments: { pageId }
            })
          }
        );
        const birdData = await birdRes.json();
        if (birdData?.channel?.channelId) {
          birdChannelId = birdData.channel.channelId;
          console.log(`[MESSENGER_CALLBACK] Bird connector created: ${birdChannelId}`);
        } else if (birdData?.code === "ResourceAlreadyExists") {
          const listRes = await fetch(
            `https://api.bird.com/workspaces/${birdWorkspaceId}/connectors`,
            { headers: { "Authorization": `AccessKey ${birdApiKey}` } }
          );
          const listData = await listRes.json();
          const existingConnector = listData?.results?.find((c: any) =>
            c.arguments?.pageId === pageId
          );
          if (existingConnector?.channel?.channelId) {
            birdChannelId = existingConnector.channel.channelId;
            console.log(`[MESSENGER_CALLBACK] Using existing Bird channel: ${birdChannelId}`);
          }
        } else {
          console.error("[MESSENGER_CALLBACK] Bird connector creation failed:", JSON.stringify(birdData));
        }
      }
    } catch (birdErr) {
      console.error("[MESSENGER_CALLBACK] Bird API error:", birdErr);
    }

    // Upsert channel in Prisma
    const existing = await prisma.channel.findFirst({
      where: { chatbotId, type: "FACEBOOK" },
    });

    const config = { accessToken: pageAccessToken, pageId, pageName, provider: "bird" };

    if (existing) {
      await prisma.channel.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          name: `Messenger: ${pageName}`,
          phoneNumberId: birdChannelId,
          config,
        },
      });
    } else {
      await prisma.channel.create({
        data: {
          chatbotId,
          type: "FACEBOOK",
          status: "CONNECTED",
          name: `Messenger: ${pageName}`,
          phoneNumberId: birdChannelId,
          config,
        },
      });
    }

    // Success – redirect back to the channel settings UI
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/integrations?meta_connected=true`
    );
  } catch (err) {
    console.error("[MESSENGER_CALLBACK] Unexpected error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots?error=callback_failed`
    );
  }
}
