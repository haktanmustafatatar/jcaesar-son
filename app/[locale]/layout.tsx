import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "J.Caesar Agent - AI Chatbots for Modern Businesses",
  description:
    "Build AI chatbots trained on your website content, documents, and knowledge base. Deploy in minutes, scale forever.",
  keywords: [
    "AI chatbot",
    "customer support",
    "chatbot builder",
    "AI assistant",
    "business automation",
  ],
  authors: [{ name: "J.Caesar Agent" }],
  openGraph: {
    title: "J.Caesar Agent - AI Chatbots for Modern Businesses",
    description:
      "Build AI chatbots trained on your website content, documents, and knowledge base.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#e25b31",
          colorBackground: "#ffffff",
          colorText: "#000000",
        },
      }}
    >
      <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
        <body
          className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}
        >
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster position="bottom-right" richColors />
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
