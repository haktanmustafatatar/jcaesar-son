import { NextRequest, NextResponse } from "next/server";
import { stripe, handleWebhookEvent } from "@/lib/stripe";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      console.error("[StripeWebhook] STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const payload = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`[StripeWebhook] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[StripeWebhook] Event received: ${event.type}`);

    // Event'i işle
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
