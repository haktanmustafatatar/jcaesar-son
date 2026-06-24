import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/auth/meta/whatsapp/authorize — Initiates WhatsApp (Embedded Signup) OAuth flow
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get("chatbotId");
    if (!chatbotId) {
      return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
    }

    const META_APP_ID = process.env.META_APP_ID;
    if (!META_APP_ID) {
      return NextResponse.json(
        { error: "META_APP_ID is not configured in environment variables." },
        { status: 500 }
      );
    }

    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/whatsapp/callback`;

    // State carries chatbotId, platform, userId for later verification
    const stateObj = { chatbotId, platform: "whatsapp", userId };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    const authUrl = new URL("https://www.facebook.com/v22.0/dialog/oauth");
    authUrl.searchParams.set("client_id", META_APP_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set(
      "scope",
      "whatsapp_business_management,whatsapp_business_messaging,business_management"
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error("[WHATSAPP_AUTHORIZE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
