import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { url } = await req.json();
    
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { scrapePage } = await import("@/lib/crawler");
    // Firecrawl Scrape for metadata & brand assets
    let scrapeResponse;
    try {
      scrapeResponse = await scrapePage(url);
    } catch (err) {
      return NextResponse.json({ error: "Scraping failed" }, { status: 500 });
    }

    const metadata = (scrapeResponse as any).data?.metadata || {};
    
    // Attempt to extract logo if not in metadata
    let logo = metadata.ogImage || metadata.twitterImage || metadata.favicon || "";
    
    // Very basic color extraction logic (mocked for now, can be improved with image analysis)
    const primaryColor = "#e25b31"; // Default JCaesar color

    return NextResponse.json({
      name: metadata.title || "",
      description: metadata.description || "",
      logo,
      primaryColor,
      language: metadata.language || "en",
    });

  } catch (error: any) {
    console.error("Discovery error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
