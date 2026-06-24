"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  RefreshCw,
  Zap,
  Bot,
  MoreVertical,
  Settings2,
  Loader2,
  Trash2,
  X,
  CheckCircle2,
  Save,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      toast.error("Billing mesh synchronization failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    // Sanitize prices (remove dots/spaces)
    const cleanPrice = (val: any) => String(val || "").replace(/\./g, "").replace(/\s/g, "");

    const data = {
      id: editingPlan?.id,
      name: formData.get("name"),
      description: formData.get("description"),
      priceMonthly: cleanPrice(formData.get("priceMonthly")),
      priceYearly: cleanPrice(formData.get("priceYearly")),
      messageLimit: formData.get("messageLimit"),
      chatbotLimit: formData.get("chatbotLimit"),
      tokenLimit: formData.get("tokenLimit"),
      extraBotPrice: formData.get("extraBotPrice"),
      crawlLimit: formData.get("crawlLimit"),
      stripePriceId: formData.get("stripePriceId"),
      isPopular: editingPlan?.isPopular || false,
      isEnterprise: editingPlan?.isEnterprise || false,
      features: editingPlan?.features || []
    };

    try {
      const method = editingPlan?.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(editingPlan?.id ? "Plan updated" : "Plan created");
        setIsEditorOpen(false);
        fetchPlans();
      } else {
        toast.error("Operation failed");
      }
    } catch (error) {
      toast.error("Internal server error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the plan permanently.")) return;
    try {
      const res = await fetch(`/api/admin/plans?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Plan deleted");
        fetchPlans();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Accessing Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <Badge variant="outline" className="mb-3 rounded-full bg-orange-500/10 text-orange-500 border-orange-500/20 font-black text-[9px] px-3 tracking-widest uppercase">Revenue Management</Badge>
           <h1 className="text-4xl font-black tracking-tight text-white mb-2">Subscription Matrix</h1>
           <p className="text-zinc-500 font-medium">Reconfigure pricing architecture and monitor global subscription revenue.</p>
        </div>
        <div className="flex items-center gap-4">
           <Button 
             onClick={() => {
               setEditingPlan({ features: [], isPopular: false, isEnterprise: false });
               setIsEditorOpen(true);
             }}
             className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 transition-all"
           >
             <Plus className="w-4 h-4 mr-2" />
             Create New Tier
           </Button>
           <Button onClick={fetchPlans} variant="outline" className="h-12 w-12 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 transition-all">
              <RefreshCw className="w-4 h-4 text-white" />
           </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {plans.map((plan, i) => (
            <motion.div
               key={plan.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="h-full"
            >
               <Card className="rounded-[40px] bg-zinc-900/40 border-white/5 hover:border-primary/20 transition-all duration-500 group relative flex flex-col h-full">
                  <div className="absolute top-0 right-0 p-8">
                     <div className={`p-4 rounded-3xl ${plan.priceMonthly > 50 ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                        <Package className={`w-6 h-6 ${plan.priceMonthly > 50 ? 'text-amber-500' : 'text-blue-500'}`} />
                     </div>
                  </div>
                  
                  <CardHeader className="p-8 pb-0">
                     <CardTitle className="text-2xl font-black text-white">{plan.name}</CardTitle>
                     <p className="text-4xl font-black text-white mt-4 flex items-baseline gap-1">
                        ₺{plan.priceMonthly}
                        <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">/AY</span>
                     </p>
                  </CardHeader>

                  <CardContent className="p-8 flex-1 flex flex-col justify-between pt-10">
                     <div className="space-y-6 mb-8">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Adoption</span>
                           <span className="text-sm font-black text-white">{plan._count?.subscriptions || 0} Assets</span>
                        </div>
                        <Progress value={Math.min((plan._count?.subscriptions / 100) * 100, 100)} className="h-1 bg-zinc-950" />
                        
                        <div className="space-y-3">
                           <div className="flex items-center gap-3">
                              <Zap className="w-4 h-4 text-primary" />
                              <span className="text-xs font-bold text-zinc-300">{plan.messageLimit?.toLocaleString() || 'Unlimited'} Messages/mo</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <Bot className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-bold text-zinc-300">{plan.chatbotLimit} Active Neural Nodes</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <DollarSign className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-zinc-300">Ekstra Bot: ₺{plan.extraBotPrice || '0.00'}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <Settings2 className="w-4 h-4 text-orange-400" />
                              <span className="text-xs font-bold text-zinc-300">Aylık Crawl: {plan.crawlLimit || 0}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-4 pt-4">
                        <Button 
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsEditorOpen(true);
                          }}
                          className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold transition-all"
                        >
                           Configure
                        </Button>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl border border-white/5 text-zinc-500">
                                 <MoreVertical className="w-5 h-5" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent className="rounded-3xl bg-zinc-950 border-white/10 p-2">
                              <DropdownMenuItem 
                                onClick={() => handleDelete(plan.id)}
                                className="rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 cursor-pointer"
                              >
                                 <Trash2 className="w-4 h-4 mr-3" /> Decommission Tier
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardContent>
               </Card>
            </motion.div>
         ))}
      </div>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white rounded-[32px] overflow-hidden p-0">
          <form onSubmit={handleSave}>
            <DialogHeader className="p-8 pb-0">
              <DialogTitle className="text-2xl font-black">{editingPlan?.id ? 'Reconfigure Tier' : 'Deploy New Tier'}</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">Define the architectural limits and pricing for this subscription level.</DialogDescription>
            </DialogHeader>

            <div className="p-8 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tier Name</Label>
                <Input name="name" defaultValue={editingPlan?.name} placeholder="e.g. Platinum" className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Description</Label>
                <Textarea name="description" defaultValue={editingPlan?.description} className="rounded-xl bg-white/5 border-white/10 font-medium min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Aylık Fiyat (₺)</Label>
                <Input 
                  name="priceMonthly" 
                  defaultValue={editingPlan?.priceMonthly?.toLocaleString('tr-TR')} 
                  placeholder="Örn: 4.999"
                  className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Yıllık Fiyat (₺)</Label>
                <Input 
                  name="priceYearly" 
                  defaultValue={editingPlan?.priceYearly?.toLocaleString('tr-TR')} 
                  placeholder="Örn: 50.000"
                  className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Message Limit</Label>
                <Input name="messageLimit" type="number" defaultValue={editingPlan?.messageLimit} className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Chatbot Limit</Label>
                <Input name="chatbotLimit" type="number" defaultValue={editingPlan?.chatbotLimit} className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Token Limit</Label>
                <Input name="tokenLimit" type="number" defaultValue={editingPlan?.tokenLimit} className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Ekstra Bot Fiyatı (₺)</Label>
                <Input name="extraBotPrice" type="number" step="0.01" defaultValue={editingPlan?.extraBotPrice} placeholder="Örn: 99.99" className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Aylık Crawl Limiti</Label>
                <Input name="crawlLimit" type="number" defaultValue={editingPlan?.crawlLimit} placeholder="Örn: 3" className="h-12 rounded-xl bg-white/5 border-white/10 font-bold" required />
              </div>

              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Plan Özellikleri (Liste)</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const newFeatures = [...(editingPlan?.features || []), ""];
                      setEditingPlan({ ...editingPlan, features: newFeatures });
                    }}
                    className="h-8 text-[10px] font-bold uppercase text-primary"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Özellik Ekle
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editingPlan?.features || []).map((feature: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={feature} 
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features];
                          newFeatures[idx] = e.target.value;
                          setEditingPlan({ ...editingPlan, features: newFeatures });
                        }}
                        placeholder="Örn: 7/24 Destek"
                        className="h-10 rounded-xl bg-white/5 border-white/10 font-medium"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          const newFeatures = editingPlan.features.filter((_: any, i: number) => i !== idx);
                          setEditingPlan({ ...editingPlan, features: newFeatures });
                        }}
                        className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Stripe Price ID</Label>
                <Input name="stripePriceId" defaultValue={editingPlan?.stripePriceId} placeholder="price_..." className="h-12 rounded-xl bg-white/5 border-white/10 font-mono text-xs" />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl col-span-2">
                <div>
                  <p className="text-sm font-bold">Popular Choice</p>
                  <p className="text-xs text-zinc-500">Highlight this plan as the most popular option.</p>
                </div>
                <Switch 
                  checked={editingPlan?.isPopular} 
                  onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, isPopular: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl col-span-2">
                <div>
                  <p className="text-sm font-bold">Enterprise Tier</p>
                  <p className="text-xs text-zinc-500">Custom pricing and unlimited nodes.</p>
                </div>
                <Switch 
                  checked={editingPlan?.isEnterprise} 
                  onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, isEnterprise: checked })}
                />
              </div>
            </div>

            <DialogFooter className="p-8 bg-zinc-900/50 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={() => setIsEditorOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSaving} className="rounded-xl px-8 font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Commit Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
