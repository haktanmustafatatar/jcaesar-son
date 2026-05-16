import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = "";
    if (file.type === "application/pdf") {
      const data = await pdf(buffer);
      text = data.text;
    } else {
      text = buffer.toString("utf-8");
    }

    // Limit text for analysis (AI only needs context)
    const previewText = text.slice(0, 15000);

    return NextResponse.json({ text: previewText });
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: "Failed to extract text" }, { status: 500 });
  }
}
