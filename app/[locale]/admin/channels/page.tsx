"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Channel = {
  id: string;
  type: string;
  name: string;
  status: string;
  phoneNumberId: string | null;
  createdAt: string;
  chatbot: {
    id: string;
    name: string;
    user: { email: string };
  };
  config: {
    hasAccessToken: boolean;
    hasBotToken: boolean;
    provider?: string;
    instagramId?: string;
    username?: string;
    pageId?: string;
  };
};

const statusColors: Record<string, string> = {
  CONNECTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISCONNECTED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  ERROR: "bg-red-500/10 text-red-400 border-red-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const statusIcons: Record<string, React.ReactNode> = {
  CONNECTED: <CheckCircle className="w-3.5 h-3.5" />,
  DISCONNECTED: <XCircle className="w-3.5 h-3.5" />,
  ERROR: <AlertCircle className="w-3.5 h-3.5" />,
  PENDING: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
};

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPhoneNumberId, setEditPhoneNumberId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (error) {
      toast.error("Kanallar yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditChannel(channel);
    setEditStatus(channel.status);
    setEditPhoneNumberId(channel.phoneNumberId || "");
  };

  const handleSave = async () => {
    if (!editChannel) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: editChannel.id,
          status: editStatus,
          phoneNumberId: editPhoneNumberId || null,
        }),
      });
      if (res.ok) {
        toast.success("Kanal güncellendi");
        setEditChannel(null);
        fetchChannels();
      } else {
        toast.error("Güncelleme başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("Bu kanalı silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/channels?channelId=${channelId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Kanal silindi");
        fetchChannels();
      } else {
        toast.error("Silme başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const filtered = channels.filter((ch) => {
    const matchSearch =
      !filter ||
      ch.name.toLowerCase().includes(filter.toLowerCase()) ||
      ch.chatbot.name.toLowerCase().includes(filter.toLowerCase()) ||
      ch.chatbot.user.email.toLowerCase().includes(filter.toLowerCase());
    const matchType = typeFilter === "ALL" || ch.type === typeFilter;
    const matchStatus = statusFilter === "ALL" || ch.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const channelTypes = [...new Set(channels.map((c) => c.type))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Kanal Yönetimi</h1>
          <p className="text-zinc-400">Tüm chatbot kanallarını görüntüle ve yönet</p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 text-zinc-300 hover:text-white"
          onClick={fetchChannels}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["CONNECTED", "DISCONNECTED", "ERROR", "PENDING"].map((status) => {
          const count = channels.filter((c) => c.status === status).length;
          return (
            <Card key={status} className="bg-zinc-900 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-full border ${statusColors[status]}`}>
                  {statusIcons[status]}
                  {status}
                </span>
                <span className="text-2xl font-bold text-white">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Kanal, chatbot veya kullanıcı ara..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-72 bg-zinc-900 border-white/10 text-white"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Tip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Tipler</SelectItem>
            {channelTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Durumlar</SelectItem>
            <SelectItem value="CONNECTED">CONNECTED</SelectItem>
            <SelectItem value="DISCONNECTED">DISCONNECTED</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-zinc-900 border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-zinc-400">Kanal</TableHead>
                <TableHead className="text-zinc-400">Tip</TableHead>
                <TableHead className="text-zinc-400">Chatbot</TableHead>
                <TableHead className="text-zinc-400">Kullanıcı</TableHead>
                <TableHead className="text-zinc-400">Durum</TableHead>
                <TableHead className="text-zinc-400">Provider</TableHead>
                <TableHead className="text-zinc-400">Phone/Channel ID</TableHead>
                <TableHead className="text-zinc-400">Token</TableHead>
                <TableHead className="text-zinc-400 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-zinc-500">
                    Kanal bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ch) => (
                  <TableRow key={ch.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="text-white font-medium">{ch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-zinc-300 border-white/10 text-xs">
                        {ch.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">{ch.chatbot.name}</TableCell>
                    <TableCell className="text-zinc-400 text-xs">{ch.chatbot.user.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${statusColors[ch.status]}`}>
                        {statusIcons[ch.status]}
                        {ch.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">{ch.config.provider || "meta"}</TableCell>
                    <TableCell className="text-zinc-400 text-xs font-mono max-w-[160px] truncate">
                      {ch.phoneNumberId || "—"}
                    </TableCell>
                    <TableCell>
                      {(ch.config.hasAccessToken || ch.config.hasBotToken) ? (
                        <span className="text-xs text-emerald-400">✓ Var</span>
                      ) : (
                        <span className="text-xs text-red-400">✗ Yok</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          onClick={() => handleEdit(ch)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                          onClick={() => handleDelete(ch.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Kanalı Düzenle — {editChannel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Durum</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONNECTED">CONNECTED</SelectItem>
                  <SelectItem value="DISCONNECTED">DISCONNECTED</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Phone/Channel ID (phoneNumberId)</Label>
              <Input
                value={editPhoneNumberId}
                onChange={(e) => setEditPhoneNumberId(e.target.value)}
                placeholder="Bird channel ID veya telefon numarası"
                className="bg-zinc-950 border-white/10 text-white font-mono text-sm"
              />
              <p className="text-xs text-zinc-500">
                WhatsApp: telefon numarası ID, Instagram/Facebook: Bird connector ID
              </p>
            </div>
            {editChannel && (
              <div className="text-xs text-zinc-500 space-y-1 pt-1 border-t border-white/10">
                <p>Chatbot: <span className="text-zinc-300">{editChannel.chatbot.name}</span></p>
                <p>Tip: <span className="text-zinc-300">{editChannel.type}</span></p>
                {editChannel.config.instagramId && <p>Instagram ID: <span className="text-zinc-300 font-mono">{editChannel.config.instagramId}</span></p>}
                {editChannel.config.username && <p>Username: <span className="text-zinc-300">@{editChannel.config.username}</span></p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditChannel(null)} className="text-zinc-400">
              İptal
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
