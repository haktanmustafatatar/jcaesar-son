import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY is required in production");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummyForBuild", {
  apiVersion: "2025-02-24.acacia",
});

// Plan fiyatlarını Stripe'dan getir
export async function getStripePrices() {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
  });

  return prices.data;
}

// Checkout session oluştur
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14, // 14 günlük ücretsiz deneme
    },
  });

  return session;
}

// Müşteri portal session oluştur
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Müşteri oluştur
export async function createCustomer({
  email,
  name,
  metadata,
}: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  });

  return customer;
}

// Abonelik detaylarını getir
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  });

  return subscription;
}

// Aboneliği iptal et
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

// Aboneliği güncelle (plan değiştirme)
export async function updateSubscription({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string;
  newPriceId: string;
}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });

  return updatedSubscription;
}

// Webhook event işleme
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }

    case "invoice.payment_failed": {
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(failedInvoice);
      break;
    }

    case "customer.subscription.updated": {
      const updatedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(updatedSub);
      break;
    }

    case "customer.subscription.paused": {
      const pausedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionPaused(pausedSub);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// Checkout tamamlandığında
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { prisma } = await import("@/lib/prisma");

  const userId = session.metadata?.userId;
  if (!userId) return;

  const type = session.metadata?.type;

  if (type === "extra-credits") {
    const amount = parseInt(session.metadata?.amount || "1000", 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, email: true, name: true, stripeCustomerId: true }
    });

    if (user) {
      if (session.customer && !user.stripeCustomerId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: session.customer as string }
        });
      }

      if (user.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          include: { plan: true }
        });
        if (org) {
          const currentOverride = org.messageLimitOverride ?? org.plan.messageLimit;
          const newOverride = currentOverride + amount;

          await prisma.organization.update({
            where: { id: user.organizationId },
            data: { messageLimitOverride: newOverride }
          });

          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Ek Limit Tanımlandı",
              message: `Başarıyla ${amount} ek mesaj limiti satın aldınız. Yeni limitiniz: ${newOverride} mesaj.`,
              type: "SUCCESS",
              link: "/dashboard/settings"
            }
          });
        }
      }

      if (user.email) {
        await sendNotificationEmail({
          to: user.email,
          subject: "Ek Limit Satın Alma İşlemi Başarılı - J.Caesar Agent",
          body: `Merhaba ${user.name || ""},\n\nSatın aldığınız ${amount} ek mesaj paketi hesabınıza başarıyla tanımlanmıştır.\n\nTeşekkürler,\nJ.Caesar Agent Ekibi`,
        });
      }
    }
    return;
  }

  const planId = session.metadata?.planId;
  if (!planId) return;

  const stripeSubscriptionId = session.subscription as string;

  // Idempotent — webhook'un birden fazla tetiklenmesi durumunda duplicate yaratmaz
  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId }
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", planId },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: "ACTIVE",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, email: true, name: true, stripeCustomerId: true }
  });

  if (user) {
    if (session.customer && !user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: session.customer as string }
      });
    }

    if (user.organizationId) {
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { planId }
      });
    }

    // Ödeme onay emaili gönder
    if (user.email) {
      await sendNotificationEmail({
        to: user.email,
        subject: "Aboneliğiniz Aktifleştirildi - J.Caesar Agent",
        body: `Merhaba ${user.name || ""},\n\nAboneliğiniz başarıyla aktifleştirildi. J.Caesar Agent'ı kullanmaya başlayabilirsiniz.\n\nTeşekkürler,\nJ.Caesar Agent Ekibi`,
      });
    }
  }
}

// Ödeme başarılı
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const { prisma } = await import("@/lib/prisma");
  console.log(`[StripeWebhook] Payment succeeded for invoice: ${invoice.id}`);

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

// Ödeme başarısız
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const { prisma } = await import("@/lib/prisma");
  console.log(`[StripeWebhook] Payment failed for invoice: ${invoice.id}`);

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "PAST_DUE" },
  });

  // Kullanıcıya bildirim emaili gönder
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: { select: { email: true, name: true } } }
  });

  if (subscription?.user?.email) {
    await sendNotificationEmail({
      to: subscription.user.email,
      subject: "Ödeme Başarısız - J.Caesar Agent",
      body: `Merhaba ${subscription.user.name || ""},\n\nAbonelik ödemeniz alınamadı. Lütfen ödeme bilgilerinizi güncelleyin.\n\nTeşekkürler,\nJ.Caesar Agent Ekibi`,
    });
  }
}

async function sendNotificationEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.EMAIL_FROM || "noreply@jcaesars.com" },
        subject,
        content: [{ type: "text/plain", value: body }],
      }),
    });
  } catch (err) {
    console.error("[StripeWebhook] Email send failed:", err);
  }
}

// Abonelik silindi
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { prisma } = await import("@/lib/prisma");

  await prisma.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: "CANCELED",
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { prisma } = await import("@/lib/prisma");
  const existingSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true }
  });

  if (!existingSub) return;

  const priceId = subscription.items.data[0]?.price.id;
  let plan = null;
  if (priceId) {
    plan = await prisma.plan.findFirst({
      where: { stripePriceId: priceId }
    });
  }

  const newStatus = subscription.status === "paused" ? "PAUSED" : subscription.status.toUpperCase();

  await prisma.subscription.update({
    where: { id: existingSub.id },
    data: {
      status: newStatus as any,
      ...(plan && { planId: plan.id }),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    }
  });

  if (plan && existingSub.user?.organizationId) {
    await prisma.organization.update({
      where: { id: existingSub.user.organizationId },
      data: { planId: plan.id }
    });
  }

  await prisma.notification.create({
    data: {
      userId: existingSub.userId,
      title: "Aboneliğiniz Güncellendi",
      message: plan ? `Aboneliğiniz ${plan.name} planına başarıyla güncellendi.` : "Abonelik detaylarınız güncellendi.",
      type: "SUCCESS",
      link: "/dashboard/settings"
    }
  });

  if (existingSub.user?.email && plan) {
    await sendNotificationEmail({
      to: existingSub.user.email,
      subject: "Aboneliğiniz Güncellendi - J.Caesar Agent",
      body: `Merhaba ${existingSub.user.name || ""},\n\nAboneliğiniz başarıyla ${plan.name} planına güncellendi.\n\nTeşekkürler,\nJ.Caesar Agent Ekibi`,
    });
  }
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const { prisma } = await import("@/lib/prisma");
  const existingSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true }
  });

  if (!existingSub) return;

  await prisma.subscription.update({
    where: { id: existingSub.id },
    data: { status: "PAUSED" }
  });

  await prisma.notification.create({
    data: {
      userId: existingSub.userId,
      title: "Planınız Duraklatıldı",
      message: "Aboneliğiniz Stripe üzerinde duraklatıldı. Botlarınız şu an pasif durumda.",
      type: "WARNING",
      link: "/dashboard/settings"
    }
  });

  if (existingSub.user?.email) {
    await sendNotificationEmail({
      to: existingSub.user.email,
      subject: "Aboneliğiniz Duraklatıldı - J.Caesar Agent",
      body: `Merhaba ${existingSub.user.name || ""},\n\nAboneliğiniz duraklatılmıştır. Sorularınız için destek ekibimizle iletişime geçebilirsiniz.\n\nTeşekkürler,\nJ.Caesar Agent Ekibi`,
    });
  }
}
