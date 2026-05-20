"use client";

import { useState, useEffect } from "react";
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Percent, 
  Hash, 
  Users, 
  CheckCircle,
  Copy,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    planId: "",
    durationDays: 14,
    maxUses: 100
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [couponRes, planRes] = await Promise.all([
        fetch("/api/admin/coupons"),
        fetch("/api/plans")
      ]);

      if (couponRes.ok) {
        setCoupons(await couponRes.json());
      }
      if (planRes.ok) {
        setPlans(await planRes.json());
      }
    } catch (error) {
      toast.error("Failed to load coupon directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.planId) {
      toast.error("Please fill in code and plan fields.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoupon)
      });

      if (res.ok) {
        toast.success("Coupon code successfully forged!");
        setIsModalOpen(false);
        setNewCoupon({ code: "", planId: "", durationDays: 14, maxUses: 100 });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to forge coupon.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional coupon?")) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Coupon deleted successfully.");
        fetchData();
      } else {
        toast.error("Failed to delete coupon.");
      }
    } catch (error) {
      toast.error("Network error.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard!`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Loading Coupons Inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="rounded-full bg-zinc-900 text-zinc-400 border-zinc-800 px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
              Marketing Tools
            </Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">Promotional Coupons</h1>
          <p className="text-zinc-400 font-medium mt-1">Generate and distribute trial activation codes</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl h-12 px-8 font-black bg-white text-zinc-950 hover:bg-zinc-100 shadow-xl shadow-white/5"
        >
          <Plus className="w-4 h-4 mr-2" />
          Forge Coupon
        </Button>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-zinc-900 bg-zinc-900/40 text-white shadow-xl">
          <CardContent className="p-8 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Coupons</p>
              <h2 className="text-3xl font-black mt-0.5">{coupons.filter(c => c.isActive).length}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-zinc-900 bg-zinc-900/40 text-white shadow-xl">
          <CardContent className="p-8 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Redeems</p>
              <h2 className="text-3xl font-black mt-0.5">
                {coupons.reduce((acc, curr) => acc + curr.usedCount, 0)}
              </h2>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-zinc-900 bg-zinc-900/40 text-white shadow-xl">
          <CardContent className="p-8 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Utilization Rate</p>
              <h2 className="text-3xl font-black mt-0.5">
                {coupons.length > 0 
                  ? Math.floor((coupons.reduce((acc, curr) => acc + curr.usedCount, 0) / coupons.reduce((acc, curr) => acc + curr.maxUses, 0)) * 100)
                  : 0}%
              </h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="rounded-[40px] border-zinc-900 bg-zinc-900/20 overflow-hidden shadow-2xl">
        <CardHeader className="p-8 border-b border-zinc-900">
          <CardTitle className="text-xl font-black text-white">Coupons Registry</CardTitle>
          <CardDescription className="text-zinc-400 font-medium">Verify coupon codes, usage metrics, and plan gates</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {coupons.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <Ticket className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Promotional Coupons Forged Yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-900/40">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">Code</TableHead>
                  <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Plan</TableHead>
                  <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Duration</TableHead>
                  <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Redeems / Max</TableHead>
                  <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <TableCell className="py-6 px-8 font-black text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 tracking-wider">
                          {coupon.code}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => copyToClipboard(coupon.code)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-zinc-300 font-bold text-sm">
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-0.5">
                        {coupon.plan.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 text-center text-zinc-300 font-bold text-sm">
                      {coupon.durationDays} Days
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-zinc-300 font-black text-sm">{coupon.usedCount} / {coupon.maxUses}</span>
                        <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-right pr-8">
                      <Button 
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Forge Coupon Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[40px] max-w-lg p-8 border-none bg-zinc-950 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Forge Promotional Coupon</DialogTitle>
            <DialogDescription className="font-medium text-zinc-400">
              Create a custom code for trial activations
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Promo Code</label>
              <Input 
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                placeholder="e.g. TRIAL14OFF"
                className="h-12 rounded-2xl bg-zinc-900 border-zinc-800 text-white font-mono uppercase tracking-wider font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Binds to Plan</label>
              <Select 
                value={newCoupon.planId}
                onValueChange={(v) => setNewCoupon({...newCoupon, planId: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-300 font-bold">
                  <SelectValue placeholder="Select target plan" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-2xl">
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="focus:bg-zinc-800 font-bold">
                      {plan.name} (${plan.priceMonthly}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Trial Days</label>
                <Input 
                  type="number"
                  value={newCoupon.durationDays}
                  onChange={(e) => setNewCoupon({...newCoupon, durationDays: Number(e.target.value)})}
                  className="h-12 rounded-2xl bg-zinc-900 border-zinc-800 text-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Max Redeems</label>
                <Input 
                  type="number"
                  value={newCoupon.maxUses}
                  onChange={(e) => setNewCoupon({...newCoupon, maxUses: Number(e.target.value)})}
                  className="h-12 rounded-2xl bg-zinc-900 border-zinc-800 text-white font-bold"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)} 
              className="rounded-2xl h-12 px-6 font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCoupon} 
              disabled={isSaving}
              className="rounded-2xl h-12 px-8 font-black bg-white text-zinc-950 hover:bg-zinc-100 shadow-xl"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Forge Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
