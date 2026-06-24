import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

    const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
    if (!INSTAGRAM_APP_ID) {
      return NextResponse.json(
        { error: "INSTAGRAM_APP_ID is not configured in environment variables." },
        { status: 500 }
      );
    }

    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/instagram/callback`;

    // State carries chatbotId and userId
    const stateObj = { chatbotId, userId };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    // Instagram Login OAuth Dialog URL via Facebook Login
    const metaAuthUrl = 
      `https://www.facebook.com/v22.0/dialog/oauth?` +
      `client_id=${INSTAGRAM_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging` +
      `&response_type=code` +
      `&state=${state}`;

    return NextResponse.json({ authUrl: metaAuthUrl });
  } catch (error) {
    console.error("[INSTAGRAM_AUTHORIZE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
