import { prisma } from "@/lib/prisma";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { NeuralIndexer } from "./indexer";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

// Re-export NeuralIndexer so workers can import from "@/lib/crawler"
export { NeuralIndexer } from "./indexer";

// Turndown configuration
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// Lazy initialization for Firecrawl to avoid build-time crashes
let _firecrawl: any = null;
async function getFirecrawl() {
  if (!_firecrawl) {
    const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
    _firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY || "fc-dummy-key-for-build",
    });
  }
  return _firecrawl;
}

/**
 * Normalize URL - handle cases where user might have added extra protocol or spaces
 */
function normalizeUrl(url: string): string {
  url = url.trim();
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url.replace(/https?:\/\/(https?:\/\/)+/g, 'https://');
  }
  return `https://${url}`;
}

/**
 * Robust Web Crawler with Firecrawl First logic
 * 
 * Strategy:
 * - If specificUrls provided → scrape each URL individually via Firecrawl
 * - If no specificUrls → use Firecrawl crawlUrl for discovery
 * - Fallback → HTTP + JSDOM internal scraper (no Playwright needed)
 */
export async function crawlWebsite({
  url: rawUrl,
  maxDepth = 3,
  limit = 100,
  chatbotId,
  dataSourceId,
  knowledgeSourceId,
  userId,
  urls: specificUrls,
}: {
  url: string;
  maxDepth?: number;
  limit?: number;
  chatbotId: string;
  dataSourceId?: string;
  knowledgeSourceId?: string;
  userId?: string;
  urls?: string[];
}) {
  const normalizedUrl = normalizeUrl(rawUrl);
  console.log(`[Crawler] Starting crawl for ${normalizedUrl}`);

  try {
    // 1. Update status to CRAWLING
    if (dataSourceId) {
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "CRAWLING", crawlStatus: "Starting crawl..." },
      });
    }

    // 2. Determine URLs to process
    let linksToProcess: string[] = [];
    if (specificUrls && specificUrls.length > 0) {
      console.log(`[Crawler] Using ${specificUrls.length} specific URLs provided by user`);
      linksToProcess = specificUrls;
    }

    // 3. Strategy A: If we have specific URLs, scrape each one individually
    if (linksToProcess.length > 0) {
      return await scrapeSpecificUrls({
        urls: linksToProcess,
        chatbotId,
        dataSourceId,
        knowledgeSourceId,
      });
    }

    // 4. Strategy B: No specific URLs — use Firecrawl full crawl
    try {
      console.log(`[Crawler] Attempting Firecrawl full crawl for ${normalizedUrl}...`);
      const firecrawl = await getFirecrawl();
      const crawlResult = await firecrawl.crawlUrl(normalizedUrl, {
        limit,
        maxDepth,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true
        }
      });

      if (crawlResult.success && crawlResult.data && crawlResult.data.length > 0) {
        console.log(`[Crawler] Firecrawl successful. Found ${crawlResult.data.length} pages.`);
        
        let indexedCount = 0;
        for (const page of crawlResult.data) {
          const content = page.markdown || page.content || "";
          if (content.trim().length < 10) continue;

          await NeuralIndexer.indexContent({
            content,
            title: page.metadata?.title || "Untitled Page",
            url: page.url || page.metadata?.sourceURL,
            metadata: page.metadata,
            chatbotId,
            dataSourceId,
            knowledgeSourceId
          });
          indexedCount++;
        }
        
        await NeuralIndexer.updateStatus(
          dataSourceId || knowledgeSourceId!, 
          dataSourceId ? "data" : "knowledge", 
          "COMPLETED",
          { lastCrawledAt: new Date(), pagesCount: indexedCount }
        );
        return { success: true, pagesCount: indexedCount };
      }
    } catch (err) {
      console.warn(`[Crawler] Firecrawl failed, falling back to internal scraper:`, err);
    }

    // 5. Fallback: Internal HTTP+JSDOM Scraper (no Playwright)
    console.log(`[Crawler] Running internal HTTP fallback for ${normalizedUrl}`);
    const pages = await internalCrawl(normalizedUrl, maxDepth, limit);
    
    let indexedCount = 0;
    for (const page of pages) {
      await NeuralIndexer.indexContent({
        content: page.markdown,
        title: page.metadata.title,
        url: page.metadata.sourceURL,
        metadata: page.metadata,
        chatbotId,
        dataSourceId,
        knowledgeSourceId
      });
      indexedCount++;
    }

    await NeuralIndexer.updateStatus(
      dataSourceId || knowledgeSourceId!, 
      dataSourceId ? "data" : "knowledge", 
      "COMPLETED",
      { lastCrawledAt: new Date(), pagesCount: indexedCount }
    );

    return { success: true, pagesCount: indexedCount };
    
  } catch (error) {
    console.error(`[Crawler] Fatal error:`, error);
    if (dataSourceId || knowledgeSourceId) {
      await NeuralIndexer.updateStatus(
        dataSourceId || knowledgeSourceId!, 
        dataSourceId ? "data" : "knowledge", 
        "ERROR",
        { crawlStatus: error instanceof Error ? error.message : "Crawl failed" }
      );
    }
    throw error;
  }
}

/**
 * Scrape specific URLs individually using Firecrawl scrapeUrl with HTTP fallback
 */
async function scrapeSpecificUrls({
  urls,
  chatbotId,
  dataSourceId,
  knowledgeSourceId,
}: {
  urls: string[];
  chatbotId: string;
  dataSourceId?: string;
  knowledgeSourceId?: string;
}) {
  let indexedCount = 0;
  let firecrawl: any = null;

  try {
    firecrawl = await getFirecrawl();
  } catch (err) {
    console.warn("[Crawler] Firecrawl not available, will use HTTP fallback for all URLs");
  }

  const BATCH_SIZE = 5;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batchUrls = urls.slice(i, i + BATCH_SIZE);

    await Promise.all(batchUrls.map(async (url) => {
      try {
        console.log(`[Crawler] Scraping specific URL: ${url}`);
        let content = "";
        let title = "Untitled Page";

        // Try Firecrawl scrapeUrl first
        if (firecrawl) {
          try {
            const result = await firecrawl.scrapeUrl(url, {
              formats: ["markdown"],
              onlyMainContent: true,
            });
            if (result.success && result.data) {
              content = result.data.markdown || result.data.content || "";
              title = result.data.metadata?.title || title;
            }
          } catch (scrapeErr) {
            console.warn(`[Crawler] Firecrawl scrapeUrl failed for ${url}, trying HTTP fallback`);
          }
        }

        // HTTP+JSDOM fallback
        if (!content || content.trim().length < 100) {
          const scraped = await httpScrape(url);
          if (scraped) {
            content = scraped.markdown;
            title = scraped.title;
          }
        }

        if (content && content.trim().length >= 100) {
          await NeuralIndexer.indexContent({
            content,
            title,
            url,
            metadata: { sourceURL: url },
            chatbotId,
            dataSourceId,
            knowledgeSourceId,
          });
          indexedCount++;
        } else {
          console.warn(`[Crawler] No usable content from ${url}`);
        }
      } catch (err) {
        console.error(`[Crawler] Failed to scrape ${url}:`, err);
        // Continue with next URL — don't fail the entire job
      }
    }));
  }

  await NeuralIndexer.updateStatus(
    dataSourceId || knowledgeSourceId!,
    dataSourceId ? "data" : "knowledge",
    indexedCount > 0 ? "COMPLETED" : "ERROR",
    { lastCrawledAt: new Date(), pagesCount: indexedCount }
  );

  return { success: indexedCount > 0, pagesCount: indexedCount };
}

/**
 * HTTP + JSDOM based page scraper (no Playwright needed — server-safe)
 */
async function httpScrape(url: string, retries = 2): Promise<{ markdown: string; title: string } | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // Timeout optimization

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JCaesarBot/1.0; +https://jcaesars.com)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
         if (response.status === 429 && i < retries) {
             await new Promise(r => setTimeout(r, 2000 * (i + 1)));
             continue;
         }
         return null;
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      let content = "";
      let title = "Untitled";

      if (article && article.content) {
        content = turndownService.turndown(article.content);
        title = article.title || "Untitled";
      } else {
        const document = dom.window.document;
        title = document.title || "Untitled";
        
        const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, noscript, iframe, svg');
        elementsToRemove.forEach(el => el.remove());
        
        if (document.body) {
           content = turndownService.turndown(document.body.innerHTML);
        }
      }

      // Thin content filtering
      if (!content || content.trim().length < 100) return null;

      return {
        markdown: content,
        title: title,
      };
    } catch (err) {
      if (i === retries) {
        console.warn(`[httpScrape] Failed for ${url} after ${retries} retries:`, err);
        return null;
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff retry
    }
  }
  return null;
}

/**
 * Intelligent Document Processor (PDF, Text, Markdown)
 */
export async function processDocument({
  fileUrl,
  fileType,
  chatbotId,
  dataSourceId,
  knowledgeSourceId,
}: {
  fileUrl: string;
  fileType: string;
  chatbotId: string;
  dataSourceId?: string;
  knowledgeSourceId?: string;
}) {
  try {
    let content = "";
    let title = "Document Upload";

    // 1. Detect Local vs Remote
    const isLocal = fileUrl.startsWith("/uploads/") || fileUrl.includes("localhost") || !fileUrl.startsWith("http");
    
    if (isLocal) {
      console.log(`[Crawler] Processing local file: ${fileUrl}`);
      const fileName = path.basename(fileUrl);
      const absolutePath = path.join(process.cwd(), "public", "uploads", fileName);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at ${absolutePath}`);
      }

      const buffer = fs.readFileSync(absolutePath);
      
      if (fileType === "application/pdf") {
        const data = await pdf(buffer);
        content = data.text;
        title = fileName;
      } else {
        content = buffer.toString("utf-8");
        title = fileName;
      }
    } else {
      console.log(`[Crawler] Processing remote file: ${fileUrl}`);
      if (fileType === "application/pdf") {
        try {
          const firecrawl = await getFirecrawl();
          const result = await firecrawl.scrapeUrl(fileUrl, { formats: ["markdown"] });
          content = result.data?.markdown || "";
        } catch {
          // Fallback: download and parse PDF directly
          const response = await fetch(fileUrl);
          const buffer = Buffer.from(await response.arrayBuffer());
          const data = await pdf(buffer);
          content = data.text;
        }
      } else {
        const response = await fetch(fileUrl);
        content = await response.text();
      }
    }

    if (!content.trim()) {
      throw new Error("No content extracted from document");
    }

    const indexedChunks = await NeuralIndexer.indexContent({
      content,
      title,
      url: fileUrl,
      metadata: { fileType, fileUrl },
      chatbotId,
      dataSourceId,
      knowledgeSourceId
    });

    await NeuralIndexer.updateStatus(
      dataSourceId || knowledgeSourceId!, 
      dataSourceId ? "data" : "knowledge", 
      "COMPLETED",
      { fileSize: Buffer.byteLength(content, 'utf8'), lastCrawledAt: new Date() }
    );

    return { success: true, chunks: indexedChunks };
  } catch (error) {
    console.error(`[Crawler] Document processing failed:`, error);
    if (dataSourceId || knowledgeSourceId) {
      await NeuralIndexer.updateStatus(
        dataSourceId || knowledgeSourceId!, 
        dataSourceId ? "data" : "knowledge", 
        "ERROR",
        { crawlStatus: error instanceof Error ? error.message : "Processing failed" }
      );
    }
    throw error;
  }
}

/**
 * Internal crawling logic using HTTP + JSDOM (server-safe, no Playwright)
 */
async function internalCrawl(startUrl: string, maxDepth: number, limit: number) {
  const pages: { markdown: string; metadata: { title: string; sourceURL: string } }[] = [];
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
  
  let baseUrl: string;
  try {
    baseUrl = new URL(startUrl).origin;
  } catch {
    return pages;
  }

  const CONCURRENCY = 5;

  while (queue.length > 0 && pages.length < limit) {
    const batchSize = Math.min(CONCURRENCY, limit - pages.length, queue.length);
    const currentBatch = queue.splice(0, batchSize);

    await Promise.all(currentBatch.map(async ({ url, depth }) => {
      if (visited.has(url)) return;
      visited.add(url);

      console.log(`[InternalCrawl] Scraping ${url} (depth ${depth})`);
      
      const scraped = await httpScrape(url);
      if (scraped) {
        pages.push({
          markdown: scraped.markdown,
          metadata: {
            title: scraped.title,
            sourceURL: url,
          }
        });

        // Link discovery for deeper crawling
        if (depth < maxDepth) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; JCaesarBot/1.0)" },
              signal: controller.signal,
            });
            clearTimeout(timeout);

            const html = await response.text();
            const dom = new JSDOM(html, { url });
            const links = Array.from(dom.window.document.querySelectorAll("a"))
              .map(a => {
                try { return new URL((a as HTMLAnchorElement).href, url).href; }
                catch { return null; }
              })
              .filter((href): href is string => {
                if (!href) return false;
                try {
                  const u = new URL(href);
                  return u.origin === baseUrl && !u.pathname.match(/\.(pdf|jpg|jpeg|png|gif|zip|css|js)$/i);
                } catch { return false; }
              });
            
            for (const link of links) {
              const cleanLink = link.split("#")[0].split("?")[0];
              if (!visited.has(cleanLink)) {
                queue.push({ url: cleanLink, depth: depth + 1 });
              }
            }
          } catch {
            // Link discovery failed, continue with existing queue
          }
        }
      }
    }));
  }

  return pages;
}

/**
 * Exported singular scrape for discovery/analysis
 */
export async function scrapePage(url: string) {
  // Try Firecrawl first
  try {
    const firecrawl = await getFirecrawl();
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    if (result.success && result.data) {
      return {
        success: true,
        data: {
          markdown: result.data.markdown || "",
          metadata: {
            title: result.data.metadata?.title || "Untitled",
            description: result.data.metadata?.description || "",
            sourceURL: url,
          }
        },
        markdown: result.data.markdown || "",
        metadata: {
          title: result.data.metadata?.title || "Untitled",
          description: result.data.metadata?.description || "",
          sourceURL: url,
        }
      };
    }
  } catch (err) {
    console.warn(`[scrapePage] Firecrawl failed for ${url}, using HTTP fallback`);
  }

  // HTTP fallback
  const scraped = await httpScrape(url);
  if (!scraped) {
    throw new Error(`Failed to scrape ${url}`);
  }

  return {
    success: true,
    data: {
      markdown: scraped.markdown,
      metadata: {
        title: scraped.title,
        description: "",
        sourceURL: url,
      }
    },
    markdown: scraped.markdown,
    metadata: {
      title: scraped.title,
      description: "",
      sourceURL: url,
    }
  };
}

/**
 * Discover sitemaps for a given URL
 */
export async function discoverSitemaps(url: string): Promise<string[]> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    console.error(`[SitemapDiscovery] Invalid URL: ${url}`);
    return [];
  }
  const commonSitemaps = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap/sitemap.xml",
  ];

  const found: string[] = [];

  // 1. Try robots.txt
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const robotsRes = await fetch(`${origin}/robots.txt`, { signal: controller.signal });
    clearTimeout(timeout);

    if (robotsRes.ok) {
      const text = await robotsRes.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.toLowerCase().trim().startsWith("sitemap:")) {
          const sitemapUrl = line.split(/sitemap:/i)[1]?.trim();
          if (sitemapUrl) found.push(sitemapUrl);
        }
      }
    }
  } catch (err) {
    console.warn("[SitemapDiscovery] Robots.txt failed", err);
  }

  // 2. Try common locations
  for (const sitemapPath of commonSitemaps) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${origin}${sitemapPath}`, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        found.push(`${origin}${sitemapPath}`);
      }
    } catch { }
  }

  return [...new Set(found)];
}

/**
 * Get all URLs from a sitemap (recursively handles sitemap indices)
 */
export async function getSitemapUrls(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 3) return []; // Prevent infinite recursion

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JCaesarBot/1.0)" },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const text = await res.text();
    
    // Basic validation
    if (!text.includes("<urlset") && !text.includes("<sitemapindex")) {
      console.warn(`[SitemapParser] URL is not a valid XML sitemap: ${sitemapUrl}`);
      return [];
    }

    const locRegex = /<loc>(.*?)<\/loc>/g;
    const matches = Array.from(text.matchAll(locRegex));
    const locs = matches.map(m => m[1]?.trim()).filter(Boolean) as string[];
    
    const pageUrls: string[] = [];
    const nestedSitemaps: string[] = [];

    for (const loc of locs) {
      if (loc.toLowerCase().endsWith(".xml") || loc.includes("sitemap")) {
        nestedSitemaps.push(loc);
      } else {
        pageUrls.push(loc);
      }
    }

    // Recursively fetch nested sitemaps
    if (nestedSitemaps.length > 0) {
      console.log(`[SitemapParser] Found ${nestedSitemaps.length} nested sitemaps in ${sitemapUrl}`);
      const results = await Promise.all(
        nestedSitemaps.map(url => getSitemapUrls(url, depth + 1))
      );
      for (const result of results) {
        pageUrls.push(...result);
      }
    }

    return [...new Set(pageUrls)];
  } catch (err) {
    console.warn("[SitemapParser] Failed to parse sitemap:", err);
    return [];
  }
}
