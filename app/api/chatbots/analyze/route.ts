import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { LLM_MODELS } from "@/lib/ai";
import { scrapePage } from "@/lib/crawler";
import { generateSystemPrompt } from "@/lib/neural-recipes";

export async function POST(req: NextRequest) {
    let url = "";
    let useCase = "support";
    let content = "";
    let title = "";

    try {
      const { userId: clerkId } = await auth();
      if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      content = body.content || "";
      title = body.title || "";
      useCase = body.useCase || "support";

      let scrapeResult: any = null;

      if (body.url) {
        let rawUrl = body.url;
        if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = 'https://' + rawUrl;
        }
        url = rawUrl;

        // Scrape content using Firecrawl
        try {
          scrapeResult = await scrapePage(url);
        } catch (e) {
          console.warn("Rapid scrape failed, attempting basic fetch:", e);
          const response = await fetch(url);
          const html = await response.text();
          scrapeResult = {
            metadata: {
              title: html.match(/<title>(.*?)<\/title>/)?.[1] || "",
              description: html.match(/<meta name="description" content="(.*?)"/)?.[1] || "",
              ogImage: html.match(/<meta property="og:image" content="(.*?)"/)?.[1] || "",
              language: "en",
            },
            markdown: html.slice(0, 5000), 
          };
        }
      } else if (content) {
        // Use manual content for analysis
        scrapeResult = {
          metadata: {
            title: title || "Manual Source",
            description: content.slice(0, 160),
            language: "en",
          },
          markdown: content,
        };
      } else {
        return NextResponse.json({ error: "URL or Content is required" }, { status: 400 });
      }
    
      if (!scrapeResult) {
        return NextResponse.json({ error: "Failed to process content" }, { status: 500 });
      }

      const metadata = {
        title: (scrapeResult.metadata as any)?.title || "",
        description: (scrapeResult.metadata as any)?.description || "",
        logo: (scrapeResult.metadata as any)?.ogImage || (scrapeResult.metadata as any)?.favicon || "",
        language: (scrapeResult.metadata as any)?.language || "en",
      };

      // 2. Generate Rich Business Context & Name via LLM
      const { text: aiAnalysis } = await generateText({
        model: LLM_MODELS["gpt-4o-mini"].provider,
        prompt: `Analyze the following ${url ? "website" : "document"} content carefully. 
        Extract/suggest a professional name for an AI chatbot based on this business (e.g., the company name or brand).
        Then, create a "Business Context" (3-4 professional sentences).
        
        STRICT RULE: Focus ONLY on factual information found in the text.
        
        Source ${url ? `URL: ${url}` : `Title: ${title}`}
        
        Content Snippet:
        ${scrapeResult.markdown?.slice(0, 10000)}
        
        Return the result as a JSON object with this exact structure:
        {
          "name": "Suggested Name",
          "context": "The 3-4 sentences of business context..."
        }
        
        JSON Result:`,
      });

      let analyzedData = { name: "My AI Agent", context: "" };
      try {
        const cleanedJson = aiAnalysis.replace(/```json|```/g, "").trim();
        analyzedData = JSON.parse(cleanedJson);
      } catch (e) {
        console.warn("JSON parsing failed, falling back to raw text analysis:", e);
        analyzedData.context = aiAnalysis.trim();
      }

      // 3. Assemble the System Prompt using Neural Recipes
      const systemPrompt = generateSystemPrompt(useCase, analyzedData.context || aiAnalysis.trim());

      const primaryColor = "#18181b"; 

      return NextResponse.json({
        name: analyzedData.name || metadata.title.split("|")[0].trim() || "My AI Agent",
        description: metadata.description.slice(0, 160),
        logo: metadata.logo,
        primaryColor,
        language: metadata.language,
        businessContext: analyzedData.context || aiAnalysis.trim(),
        systemPrompt,
      });
    } catch (error: any) {
      console.error("Detailed Analysis error:", error);
      return NextResponse.json({ error: "Analysis failed", details: error.message }, { status: 500 });
    }
}
