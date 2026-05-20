"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Crown,
  User as UserIcon,
  Ban,
  Shield,
  MessageSquare,
  Bot,
  Filter,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      toast.error("Failed to synchronize user records");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success(`User elevated to ${newRole}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to update security clearance");
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId, planId }),
      });
      if (res.ok) {
        toast.success("Organization plan recalibrated");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Failed to update billing plan");
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      toast.loading("Giriş bileti oluşturuluyor...", { id: "impersonate" });
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId })
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Bağlantı kuruldu! Yönlendiriliyorsunuz...", { id: "impersonate" });
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Giriş başarısız oldu", { id: "impersonate" });
      }
    } catch (error) {
      toast.error("Sistem hatası", { id: "impersonate" });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Kimlik Kasasına Erişiliyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Kimlik Yönetimi</h1>
          <p className="text-zinc-500 font-medium">Platform genelindeki kullanıcı erişimlerini ve abonelik kademelerini yönetin.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">{users.length}</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Toplam Varlık</span>
           </div>
           <Button onClick={fetchUsers} variant="outline" className="rounded-2xl h-11 border-white/5 hover:bg-white/5">
              <RefreshCw className="w-4 h-4" />
           </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="İsim, e-posta veya sinirsel ID ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 bg-zinc-900/50 border-white/5 text-white rounded-[20px] focus:ring-primary/20 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
           {["HEPSİ", "USER", "ADMIN"].map(role => (
              <Button 
                key={role}
                onClick={() => setFilterRole(role === "HEPSİ" ? "ALL" : role)}
                variant={(role === "HEPSİ" ? "ALL" : role) === filterRole ? "default" : "ghost"}
                className={cn(
                  "h-11 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                  (role === "HEPSİ" ? "ALL" : role) === filterRole ? "bg-primary text-white" : "text-zinc-500 hover:bg-white/5"
                )}
              >
                {role}
              </Button>
           ))}
        </div>
      </div>

      {/* Users DataTable */}
      <Card className="rounded-[40px] bg-zinc-900/40 border-white/5 overflow-hidden shadow-2xl">
         <Table>
            <TableHeader className="bg-zinc-950/50">
               <TableRow className="border-white/5 hover:bg-transparent px-6">
                  <TableHead className="w-[300px] text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16 pl-10">Varlık</TableHead>
                  <TableHead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16">Yetkİ Seviyesi</TableHead>
                  <TableHead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16">Aktif Plan</TableHead>
                  <TableHead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16">Token / Maliyet</TableHead>
                  <TableHead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16 text-center">Neural Düğümler</TableHead>
                  <TableHead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest h-16">Durum</TableHead>
                  <TableHead className="text-right h-16 pr-10"></TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                     <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                           <Avatar className="w-11 h-11 rounded-2xl border border-white/10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold">
                                 {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                              <span className="font-bold text-white text-sm">{user.name || "Anonim Varlık"}</span>
                              <span className="text-[11px] text-zinc-500 font-medium">{user.email}</span>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell>
                        <Badge className={`rounded-xl px-3 py-1 text-[10px] font-black tracking-widest ${
                           user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                           {user.role}
                        </Badge>
                     </TableCell>
                     <TableCell>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-white uppercase tracking-tighter">
                              {user.subscriptions?.[0]?.plan?.name || "Free Trial"}
                           </span>
                           <span className="text-[9px] text-zinc-500 font-bold">
                              {user.subscriptions?.[0]?.status || "PENDING"}
                           </span>
                        </div>
                     </TableCell>
                     <TableCell>
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-white">
                              {user.tokenUsage?.reduce((acc: number, curr: any) => acc + curr.tokensUsed, 0).toLocaleString() || 0}
                           </span>
                           <span className="text-[10px] text-emerald-500 font-bold">
                              ${user.tokenUsage?.reduce((acc: number, curr: any) => acc + curr.cost, 0).toFixed(4) || "0.0000"}
                           </span>
                        </div>
                     </TableCell>
                     <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                           <span className="font-black text-white">{user.chatbots?.length || 0}</span>
                           <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Düğüm Aktİf</span>
                        </div>
                     </TableCell>
                     <TableCell>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-bold text-zinc-300">AKTİF</span>
                         </div>
                     </TableCell>
                     <TableCell className="text-right pr-10">
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-white/5 text-zinc-500">
                                 <MoreHorizontal className="w-5 h-5" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-56 rounded-3xl bg-zinc-950 border-white/10 p-2 shadow-3xl">
                              <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Varlık Kontrolleri</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem className="rounded-2xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5 cursor-pointer">
                                 <UserIcon className="w-4 h-4 mr-3 text-primary" /> Profil Detayları
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleImpersonate(user.id)}
                                className="rounded-2xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5 cursor-pointer"
                              >
                                 <Bot className="w-4 h-4 mr-3 text-emerald-400" /> Müşteri Paneline Geçiş Yap
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-2xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5 cursor-pointer">
                                 <Mail className="w-4 h-4 mr-3 text-blue-400" /> Protokol Gönder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                               <DropdownMenuItem 
                                 onClick={() => handleUpdateRole(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                 className="rounded-2xl px-4 py-3 text-sm font-bold text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                              >
                                 <Shield className="w-4 h-4 mr-3" /> Yetki Değiştir
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuLabel className="px-4 py-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Plan Güncelle</DropdownMenuLabel>
                              {plans.map(plan => (
                                <DropdownMenuItem 
                                  key={plan.id}
                                  onClick={() => handleUpdatePlan(user.id, plan.id)}
                                  className="rounded-2xl px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 cursor-pointer"
                                >
                                  <Crown className="w-3 h-3 mr-3 text-primary" /> {plan.name}
                                </DropdownMenuItem>
                              ))}

                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem className="rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 cursor-pointer">
                                 <Ban className="w-4 h-4 mr-3" /> Erişimi Geri Çek
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </TableCell>
                  </TableRow>
               ))}
            </TableBody>
         </Table>
         
         {filteredUsers.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <Users className="w-12 h-12 text-zinc-800" />
               <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Ağda eşleşen bir varlık bulunamadı.</p>
            </div>
         )}
      </Card>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
