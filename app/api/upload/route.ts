import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addCrawlJob } from "@/lib/queue";

// POST /api/upload - Dosya yükle
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const chatbotId = formData.get("chatbotId") as string;

    if (!file || !chatbotId) {
      return NextResponse.json(
        { error: "File and chatbotId required" },
        { status: 400 }
      );
    }

    // Dosya tipini kontrol et
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Dosya boyutunu kontrol et (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    // Resolve internal user ID from Clerk ID
    const user = await prisma.user.findUnique({ where: { clerkId: clerkId as string } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Chatbot'u kontrol et
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, userId: user.id },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Save file locally
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = `public/uploads/${fileName}`;
    const publicPath = `/uploads/${fileName}`;
    
    const fs = require("fs");
    const path = require("path");
    const absolutePath = path.join(process.cwd(), filePath);
    
    fs.writeFileSync(absolutePath, buffer);

    const fileUrl = publicPath;

    // Data source oluştur
    const dataSource = await prisma.dataSource.create({
      data: {
        chatbotId,
        type: "FILE",
        name: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
        status: "PENDING",
      },
    });

    // Queue'ya process job ekle
    const job = await addCrawlJob({
      type: "process-document",
      fileUrl,
      fileType: file.type,
      chatbotId,
      dataSourceId: dataSource.id,
      userId: user.id,
    });

    // Local Development Bypass: Process immediately if on local
    if (process.env.NODE_ENV === "development") {
      const { processDocument } = require("@/lib/crawler");
      console.log(`[UploadBypass] Local environment detected. Auto-processing: ${file.name}`);
      
      // Run in background
      (async () => {
        try {
          await processDocument({
            fileUrl,
            fileType: file.type,
            chatbotId,
            dataSourceId: dataSource.id,
          });
          console.log(`[UploadBypass] Successfully processed: ${file.name}`);
        } catch (err) {
          console.error(`[UploadBypass] Failed to process ${file.name}:`, err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      dataSourceId: dataSource.id,
      jobId: job.id,
      fileName: file.name,
      fileSize: file.size,
      message: "File uploaded and processing started",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
