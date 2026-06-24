import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  let chatbotId = "";
  let userId = "";

  try {
    // Decode and parse state
    const decodedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    chatbotId = decodedState.chatbotId;
    userId = decodedState.userId;
  } catch (error) {
    console.error("[INSTAGRAM_CALLBACK_ERROR] Failed to decode state:", error);
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  try {
    const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
    const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/instagram/callback`;

    if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET) {
      console.error("[INSTAGRAM_CALLBACK_ERROR] Missing app credentials in environment");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=credentials_missing`
      );
    }

    // 1. Code to Short-Lived Access Token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `client_id=${INSTAGRAM_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${INSTAGRAM_APP_SECRET}` +
      `&code=${code}`
    );
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("[INSTAGRAM_CALLBACK_ERROR] Meta OAuth Token Error:", tokenData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=token_failed`
      );
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Short-Lived Token to Long-Lived Token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${INSTAGRAM_APP_ID}` +
      `&client_secret=${INSTAGRAM_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      console.error("[INSTAGRAM_CALLBACK_ERROR] Long-Lived Token Exchange Error:", longLivedData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=long_token_failed`
      );
    }

    const longLivedToken = longLivedData.access_token;

    // 3. Find Pages and associated Instagram Business Accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id,username,name},access_token&access_token=${longLivedToken}`
    );
    const accountsData = await accountsResponse.json();

    if (accountsData.error) {
      console.error("[INSTAGRAM_CALLBACK_ERROR] Graph API Pages Retrieval Error:", accountsData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=pages_retrieval_failed`
      );
    }

    // Find the first Page connected to an Instagram Business account
    const pageWithInstagram = accountsData.data?.find((page: any) => page.instagram_business_account);

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      console.error("[INSTAGRAM_CALLBACK_ERROR] No connected Instagram Business accounts found");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=no_instagram_linked`
      );
    }

    const instagramAccount = pageWithInstagram.instagram_business_account;
    const instagramId = instagramAccount.id;
    const username = instagramAccount.username;

    const pageAccessToken = pageWithInstagram.access_token || longLivedToken;

    // Subscribe the Page to the App for Instagram messages (using "messages" only, no "comments")
    try {
      const subscribeUrl = `https://graph.facebook.com/v22.0/${pageWithInstagram.id}/subscribed_apps?subscribed_fields=messages&access_token=${pageAccessToken}`;
      const subRes = await fetch(subscribeUrl, { method: "POST" });
      const subData = await subRes.json();
      console.log("[INSTAGRAM_CALLBACK] Subscribed page to app for Instagram:", subData);
    } catch (subErr) {
      console.error("[INSTAGRAM_CALLBACK] Failed to subscribe page to app:", subErr);
    }

    // 4. Create Bird connector and get channelId
    let birdChannelId = instagramId; // fallback to instagramId if Bird fails
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
              connectorTemplateRef: "instagram:1",
              name: `Instagram: ${username}`,
              arguments: {
                instagramAccountId: instagramId,
                instagramUsername: username,
                pageId: pageWithInstagram.id,
              }
            })
          }
        );
        const birdData = await birdRes.json();
        if (birdData?.channel?.channelId) {
          birdChannelId = birdData.channel.channelId;
          console.log(`[INSTAGRAM_CALLBACK] Bird connector created: ${birdChannelId}`);
        } else if (birdData?.code === "ResourceAlreadyExists") {
          // Connector already exists — fetch existing channel ID
          const listRes = await fetch(
            `https://api.bird.com/workspaces/${birdWorkspaceId}/connectors`,
            { headers: { "Authorization": `AccessKey ${birdApiKey}` } }
          );
          const listData = await listRes.json();
          const existing = listData?.results?.find((c: any) =>
            c.connectorTemplateRef === "instagram:1" &&
            c.arguments?.instagramAccountId === instagramId
          );
          if (existing?.channel?.channelId) {
            birdChannelId = existing.channel.channelId;
            console.log(`[INSTAGRAM_CALLBACK] Using existing Bird channel: ${birdChannelId}`);
          }
        } else {
          console.error("[INSTAGRAM_CALLBACK] Bird connector creation failed:", JSON.stringify(birdData));
        }
      }
    } catch (birdErr) {
      console.error("[INSTAGRAM_CALLBACK] Bird API error:", birdErr);
    }

    // 5. Save Channel details (Prisma create/update)
    const existingChannel = await prisma.channel.findFirst({
      where: {
        chatbotId,
        type: "INSTAGRAM"
      }
    });

    const finalConfig = {
      accessToken: pageAccessToken,
      instagramId: instagramId,
      username: username,
      provider: "bird",
      pageId: pageWithInstagram.id
    };

    if (existingChannel) {
      await prisma.channel.update({
        where: { id: existingChannel.id },
        data: {
          status: "CONNECTED",
          name: `Instagram: @${username}`,
          phoneNumberId: birdChannelId,
          config: finalConfig
        }
      });
    } else {
      await prisma.channel.create({
        data: {
          chatbotId,
          type: "INSTAGRAM",
          status: "CONNECTED",
          phoneNumberId: birdChannelId,
          name: `Instagram: @${username}`,
          config: finalConfig
        }
      });
    }

    // 5. Successful redirect
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/integrations?meta_connected=true`
    );

  } catch (error) {
    console.error("[INSTAGRAM_CALLBACK_ERROR] Unexpected error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/chatbots/${chatbotId}/settings?tab=channels&error=auth_failed`
    );
  }
}
