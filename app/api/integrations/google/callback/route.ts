import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

/**
 * GET /api/integrations/google/callback
 * Handles Google OAuth callback, exchanges authorization code for refresh tokens,
 * encrypts the credentials, and links Google Calendar to the chatbot.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Expected state format: URL-encoded JSON { chatbotId, clientId, clientSecret }

    if (!code || !state) {
      return new Response("Missing code or state parameters", { status: 400 });
    }

    let chatbotId = "";
    let clientId = "";
    let clientSecret = "";

    try {
      const parsedState = JSON.parse(decodeURIComponent(state));
      chatbotId = parsedState.chatbotId;
      clientId = parsedState.clientId;
      clientSecret = parsedState.clientSecret;
    } catch (err) {
      return new Response("Invalid state parameter", { status: 400 });
    }

    if (!chatbotId || !clientId || !clientSecret) {
      return new Response("State parameter is missing chatbotId, clientId, or clientSecret", { status: 400 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      // Note: Google only sends refresh_token on the FIRST authorization.
      // If re-connecting, user must select their account and Google must prompt for consent (access_type=offline & prompt=consent)
      return new Response("Google did not return a refresh token. If you already connected, please remove permissions from your Google Account settings and try again to force consent prompt.", { status: 400 });
    }

    const config = {
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token
    };

    const encryptedConfig = encrypt(JSON.stringify(config));

    // Connect Google Calendar Channel via Database upsert
    const existingChannel = await prisma.channel.findFirst({
      where: { chatbotId, type: "GOOGLE_CALENDAR" }
    });

    if (existingChannel) {
      await prisma.channel.update({
        where: { id: existingChannel.id },
        data: {
          config: encryptedConfig as any,
          status: "CONNECTED"
        }
      });
    } else {
      await prisma.channel.create({
        data: {
          chatbotId,
          type: "GOOGLE_CALENDAR",
          name: "Google Calendar",
          config: encryptedConfig as any,
          status: "CONNECTED"
        }
      });
    }

    // Redirect back to chatbot settings channels tab
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/chatbots/${chatbotId}/settings?tab=channels`;
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("[GoogleOAuthCallback] OAuth failed:", error);
    return new Response(`Google OAuth Callback Error: ${error.message || error}`, { status: 500 });
  }
}
