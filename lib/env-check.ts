/**
 * Environment Variable Validation
 * Run at application startup to catch missing configuration early
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // Critical — app won't function without these
  { name: "DATABASE_URL", required: true, description: "PostgreSQL connection string (with pgvector)" },
  { name: "OPENAI_API_KEY", required: true, description: "OpenAI API key for embeddings and chat" },
  { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", required: true, description: "Clerk publishable key" },
  { name: "CLERK_SECRET_KEY", required: true, description: "Clerk secret key" },
  
  // Important — features degrade without these
  { name: "REDIS_URL", required: false, description: "Redis URL for BullMQ job queues" },
  { name: "FIRECRAWL_API_KEY", required: false, description: "Firecrawl API key for web crawling" },
  { name: "NEXT_PUBLIC_APP_URL", required: false, description: "Public app URL for redirects/webhooks" },
  
  // Optional — specific features
  { name: "STRIPE_SECRET_KEY", required: false, description: "Stripe secret key for payments" },
  { name: "STRIPE_WEBHOOK_SECRET", required: false, description: "Stripe webhook signing secret" },
  { name: "ANTHROPIC_API_KEY", required: false, description: "Anthropic API key for Claude models" },
  { name: "META_APP_ID", required: false, description: "Meta (Facebook) App ID for OAuth" },
  { name: "META_APP_SECRET", required: false, description: "Meta App Secret for OAuth" },
  { name: "META_VERIFY_TOKEN", required: false, description: "Meta webhook verification token" },
];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value || value.includes("dummy") || value.includes("your-")) {
      if (envVar.required) {
        errors.push(`❌ MISSING: ${envVar.name} — ${envVar.description}`);
      } else {
        warnings.push(`⚠️  OPTIONAL: ${envVar.name} — ${envVar.description}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Log validation results to console at startup
 */
export function logEnvValidation(): void {
  const { valid, errors, warnings } = validateEnv();

  if (valid && warnings.length === 0) {
    console.log("✅ [EnvCheck] All environment variables are configured");
    return;
  }

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║           JCaesar — Environment Check               ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  if (errors.length > 0) {
    console.error("CRITICAL — The following required variables are missing:");
    for (const err of errors) {
      console.error(`  ${err}`);
    }
    console.error("");
  }

  if (warnings.length > 0) {
    console.warn("OPTIONAL — The following features will be degraded:");
    for (const warn of warnings) {
      console.warn(`  ${warn}`);
    }
    console.warn("");
  }

  if (!valid) {
    console.error("⛔ Application may not function correctly. Fix the CRITICAL errors above.\n");
  }
}
