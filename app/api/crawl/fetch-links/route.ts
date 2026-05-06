import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const { getSitemapUrls, discoverSitemaps } = await import("@/lib/crawler");
    
    console.log(`[FetchLinks] Discovering sitemaps for: ${url}`);
    const sitemaps = await discoverSitemaps(url);
    console.log(`[FetchLinks] Sitemaps found:`, sitemaps);
    
    let discoveredLinks: string[] = [];
    
    // Try all discovered sitemaps until we find some links
    for (const sitemap of sitemaps) {
      try {
        const links = await getSitemapUrls(sitemap);
        if (links.length > 0) {
          discoveredLinks = links;
          break;
        }
      } catch (err) {
        console.warn(`[FetchLinks] Failed to parse sitemap ${sitemap}:`, err);
      }
    }
    
    if (discoveredLinks.length === 0) {
      console.log(`[FetchLinks] No links found in sitemaps, falling back to root URL`);
      discoveredLinks = [url];
    }

    // Filter out duplicates and invalid URLs
    discoveredLinks = [...new Set(discoveredLinks)].filter(link => {
      try {
        new URL(link);
        return true;
      } catch { return false; }
    });

    // Limit to 1000
    discoveredLinks = discoveredLinks.slice(0, 1000);

    const links = discoveredLinks.map((link: string) => ({
      url: link,
      status: "new",
      selected: true,
      size: "TBD",
    }));

    return NextResponse.json({ links });

  } catch (error: any) {
    console.error("Fetch-links error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
