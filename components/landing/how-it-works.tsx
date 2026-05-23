"use client";

import { motion } from "framer-motion";
import { Link2, Brain, Rocket, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("Landing.HowItWorks");

  const steps = [
    {
      number: "01",
      icon: Link2,
      title: t("steps.0.title"),
      description: t("steps.0.description"),
      visual: t("steps.0.visual", { count: 247 }),
    },
    {
      number: "02",
      icon: Brain,
      title: t("steps.1.title"),
      description: t("steps.1.description"),
      visual: t("steps.1.visual"),
    },
    {
      number: "03",
      icon: Rocket,
      title: t("steps.2.title"),
      description: t("steps.2.description"),
      visual: t("steps.2.visual"),
    },
    {
      number: "04",
      icon: MessageCircle,
      title: t("steps.3.title"),
      description: t("steps.3.description"),
      visual: t("steps.3.visual"),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium text-primary mb-4 tracking-wider uppercase"
          >
            {t("badge")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {t("title")}
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden lg:block" />

          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{
                  opacity: 0,
                  x: index % 2 === 0 ? -50 : 50,
                }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`relative grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                  index % 2 === 1 ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Content */}
                <div
                  className={`${index % 2 === 1 ? "lg:order-2 lg:text-left" : "lg:text-right"}`}
                >
                  <div
                    className={`inline-flex items-center gap-4 mb-4 ${
                      index % 2 === 1 ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    <span className="text-5xl font-bold text-primary/20">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-semibold mb-4">
                    {step.title}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Visual */}
                <div
                  className={`${index % 2 === 1 ? "lg:order-1" : ""}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-2xl p-8 border border-black/5 shadow-lg"
                  >
                    {index === 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                          <Link2 className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium">
                            https://your-website.com
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs text-muted-foreground">
                            {step.visual}
                          </span>
                        </div>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-xl">
                          <p className="text-sm font-medium mb-2">Personality</p>
                          <div className="flex gap-2 flex-wrap">
                            {["Friendly", "Professional", "Casual"].map((tLabel) => (
                              <span
                                key={tLabel}
                                className={`px-3 py-1 rounded-full text-xs ${
                                  tLabel === "Professional"
                                    ? "bg-primary text-white"
                                    : "bg-white border"
                                }`}
                              >
                                {tLabel}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Brain className="w-4 h-4 text-primary" />
                          <span>{step.visual}</span>
                        </div>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-zinc-900 rounded-xl font-mono text-xs text-green-400 overflow-x-auto">
                          <p>{`<script`}</p>
                          <p className="pl-4">{`src="https://jcaesar.agent/embed.js"`}</p>
                          <p className="pl-4">{`data-bot-id="your-bot-id"`}</p>
                          <p>{`></script>`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {step.visual}
                          </span>
                        </div>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-xl flex items-center justify-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white"><MessageCircle className="w-5 h-5" /></div>
                           <div className="w-8 h-[2px] bg-border" />
                           <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white"><Brain className="w-5 h-5" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {step.visual}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Timeline Node */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-4 border-white shadow-lg hidden lg:block"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
