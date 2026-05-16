"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle2, Mail, MessageSquare, Building2, Phone } from "lucide-react";
import { toast } from "sonner";

interface EnterpriseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseForm({ open, onOpenChange }: EnterpriseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    // 1. Email Validation (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Lütfen geçerli bir e-posta adresi giriniz.");
      return;
    }

    // 1.1. Block Temp Mail Domains
    const tempMailDomains = [
      "tempmail.com", "temp-mail.org", "guerrillamail.com", "sharklasers.com", 
      "10minutemail.com", "mailinator.com", "yopmail.com", "dispostable.com",
      "getairmail.com", "guerrillamailblock.com", "guerrillamail.net", 
      "guerrillamail.org", "guerrillamail.biz", "spam4.me", "grr.la",
      "pokemail.net", "dropmail.me", "moakt.com", "disposable.com"
    ];
    const domain = email.split("@")[1]?.toLowerCase();
    if (tempMailDomains.includes(domain)) {
      toast.error("Geçici e-posta adresleri kabul edilmemektedir. Lütfen kalıcı bir adres kullanın.");
      return;
    }

    // 2. Phone Validation (Must contain numbers)
    const phoneRegex = /^[\d\s\+\-\(\)]{7,20}$/;
    if (phone && !phoneRegex.test(phone)) {
      toast.error("Lütfen geçerli bir telefon numarası giriniz.");
      return;
    }

    setIsSubmitting(true);
    
    const data = {
      name: formData.get("name"),
      email,
      company: formData.get("company"),
      phone,
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/enterprise-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setIsSuccess(true);
        toast.success("Talebiniz başarıyla alındı.");
        setTimeout(() => {
          onOpenChange(false);
          setIsSuccess(false);
        }, 3000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Bir hata oluştu, lütfen tekrar deneyin.");
      }
    } catch (error) {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-[32px] border-2 border-zinc-100 shadow-2xl overflow-hidden p-0">
        {!isSuccess ? (
          <form onSubmit={handleSubmit}>
            <div className="p-8 bg-gradient-to-br from-zinc-50 to-white">
              <DialogHeader className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center mb-6 shadow-xl shadow-black/10">
                   <Building2 className="w-7 h-7 text-white" />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight text-zinc-900 leading-tight">
                  Enterprise Çözümler <br/>
                  <span className="text-primary italic">Özel Teklif Alın</span>
                </DialogTitle>
                <DialogDescription className="text-zinc-500 font-medium text-base pt-2">
                  İhtiyaçlarınıza özel altyapı ve fiyatlandırma için ekibimiz sizinle iletişime geçecektir.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Ad Soyad</Label>
                  <Input name="name" placeholder="John Doe" className="h-12 rounded-xl bg-white border-zinc-200 focus:border-primary/50 transition-all font-bold" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">E-posta Adresİnİz</Label>
                  <Input name="email" type="email" placeholder="john@example.com" className="h-12 rounded-xl bg-white border-zinc-200 focus:border-primary/50 transition-all font-bold" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Şİrket Adı</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input name="company" placeholder="JCaesar AI" className="h-12 pl-11 rounded-xl bg-white border-zinc-200 focus:border-primary/50 transition-all font-bold" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input name="phone" type="tel" placeholder="05XX XXX XX XX" className="h-12 pl-11 rounded-xl bg-white border-zinc-200 focus:border-primary/50 transition-all font-bold" />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Mesajınız & İhtİyaçlarınız</Label>
                  <Textarea name="message" placeholder="Size nasıl yardımcı olabiliriz?" className="min-h-[120px] rounded-xl bg-white border-zinc-200 focus:border-primary/50 transition-all font-medium" required />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-zinc-50 border-t border-zinc-100 flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Hızlı İletİşİm İçİn</p>
                <a href="mailto:kaiser@jcaesars.com" className="text-sm font-black text-primary hover:underline">kaiser@jcaesars.com</a>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-900 font-black uppercase tracking-widest shadow-2xl shadow-black/20 group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Teklİf Al
                    <Send className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="p-16 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-500">
             <div className="w-24 h-24 rounded-[40px] bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
             </div>
             <h3 className="text-3xl font-black tracking-tight text-zinc-900">Harİka! Talebİnİz Alındı.</h3>
             <p className="text-zinc-500 font-medium max-w-[320px]">
               Ekibimiz verilerinizi inceleyip 24 saat içerisinde size geri dönüş sağlayacaktır.
             </p>
             <div className="pt-8 border-t border-zinc-100 w-full">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Acİl Durumlar İçİn</p>
                <Button variant="ghost" className="font-black text-primary hover:bg-primary/5" asChild>
                  <a href="mailto:kaiser@jcaesars.com">kaiser@jcaesars.com</a>
                </Button>
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
