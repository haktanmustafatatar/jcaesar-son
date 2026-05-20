"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export function FAQ() {
  const t = useTranslations("Landing.FAQ");

  const faqs = useMemo(() => [
    {
      question: t("items.0.question"),
      answer: t("items.0.answer"),
    },
    {
      question: t("items.1.question"),
      answer: t("items.1.answer"),
    },
    {
      question: t("items.2.question"),
      answer: t("items.2.answer"),
    },
    {
      question: t("items.3.question"),
      answer: t("items.3.answer"),
    },
    {
      question: t("items.4.question"),
      answer: t("items.4.answer"),
    },
    {
      question: t("items.5.question"),
      answer: t("items.5.answer"),
    },
    {
      question: t("items.6.question"),
      answer: t("items.6.answer"),
    },
    {
      question: t("items.7.question"),
      answer: t("items.7.answer"),
    },
  ], [t]);

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
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

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-black/5 rounded-xl px-6 data-[state=open]:border-primary/20 transition-colors"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
