import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/auth/meta — Start Meta OAuth flow
 * Redirects user to Facebook Login dialog
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");
    const platform = searchParams.get("platform") || "whatsapp"; // whatsapp | instagram | facebook

    if (!chatbotId) {
      return NextResponse.json({ error: "chatbotId is required" }, { status: 400 });
    }

    const appId = process.env.META_APP_ID;
    if (!appId) {
      return NextResponse.json(
        { error: "Meta App ID not configured. Please contact support." },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

    // Build scopes based on platform
    let scopes: string[] = [];
    switch (platform) {
      case "whatsapp":
        scopes = [
          "whatsapp_business_management",
          "whatsapp_business_messaging",
          "business_management",
        ];
        break;
      case "instagram":
        scopes = [
          "instagram_basic",
          "instagram_manage_messages",
          "pages_messaging",
          "pages_show_list",
        ];
        break;
      case "facebook":
        scopes = [
          "pages_messaging",
          "pages_show_list",
          "pages_manage_metadata",
        ];
        break;
    }

    // State parameter carries chatbotId and platform for callback
    const state = JSON.stringify({ chatbotId, platform, userId });
    const encodedState = Buffer.from(state).toString("base64");

    const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(","));
    authUrl.searchParams.set("state", encodedState);
    authUrl.searchParams.set("response_type", "code");

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("[MetaOAuth] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
