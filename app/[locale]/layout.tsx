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
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
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
import { SecurityShield } from "@/components/security/security-shield";

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
      signInUrl={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      appearance={{
        variables: {
          colorPrimary: "#e25b31",
          colorBackground: "#ffffff",
          colorText: "#000000",
        },
      }}
    >
      <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "J.Caesar AI Agent",
                "operatingSystem": "All",
                "applicationCategory": "BusinessApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "19.00",
                  "priceCurrency": "USD"
                },
                "description": "Build, customize, and deploy conversational AI chatbots trained on your web context, text, and custom knowledge documents.",
                "featureList": [
                  "Interactive AI Chatbots",
                  "Staff Availability Calendars",
                  "Embedded Stripe Paywalls",
                  "Omnichannel Social Inbox Integration",
                  "Omnipresent AI Customer Assistance"
                ]
              })
            }}
          />
        </head>
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
              {/* <SecurityShield /> */}
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
