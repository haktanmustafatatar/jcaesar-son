import { SignIn } from "@clerk/nextjs";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignInPage({ params }: PageProps) {
  const { locale } = await params;
  
  // Since localePrefix is 'as-needed', the default locale ('tr') doesn't have a path prefix.
  const actualPath = locale === "tr" ? "/sign-in" : `/${locale}/sign-in`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8">
        <SignIn
          path={actualPath}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl border-0",
              headerTitle: "text-2xl font-semibold",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton:
                "border border-black/10 hover:bg-muted transition-colors",
              formFieldInput:
                "border-black/10 focus:border-primary focus:ring-primary",
              formButtonPrimary:
                "bg-primary hover:bg-primary/90 text-white",
              footerActionLink: "text-primary hover:text-primary/80",
            },
          }}
        />
      </div>
    </div>
  );
}
