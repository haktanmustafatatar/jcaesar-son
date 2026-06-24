"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  MoreHorizontal, 
  Plus, 
  Settings, 
  BarChart3, 
  MessageSquare, 
  ExternalLink, 
  Loader2, 
  Trash2 
} from "lucide-react";

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchChatbots();
  }, []);

  const fetchChatbots = async () => {
    try {
      const res = await fetch("/api/chatbots");
      if (res.ok) {
        const data = await res.json();
        setChatbots(data);
      }
    } catch (error) {
      console.error("Error fetching chatbots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const res = await fetch(`/api/chatbots/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Chatbot deleted successfully");
        setChatbots(chatbots.filter(c => c.id !== deleteId));
      } else {
        toast.error("Failed to delete chatbot");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
    } finally {
      setDeleteId(null);
    }
  };
  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
            Elite AI Intelligence
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage your high-performance autonomous agents
          </p>
        </div>
        <Link href="/dashboard/chatbots/new">
          <Button className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-2xl h-11 px-8 font-bold shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95 group">
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Launch New Agent
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {chatbots.map((chatbot, index) => (
            <motion.div
              key={chatbot.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              className="group"
            >
              <Card className="relative overflow-hidden rounded-[40px] border-muted/40 bg-zinc-50/10 backdrop-blur-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-2 border-2 hover:border-primary/20">
                <div className="absolute top-0 right-0 p-6 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100">
                        <MoreHorizontal className="w-5 h-5 text-zinc-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl border-muted/40 shadow-2xl p-2 min-w-[160px]">
                      <DropdownMenuItem 
                        className="rounded-xl cursor-pointer py-2.5 font-medium"
                        onClick={() => router.push(`/dashboard/chatbots/${chatbot.id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2 text-blue-500" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-xl cursor-pointer py-2.5 font-medium"
                        onClick={() => router.push(`/dashboard/chatbots/${chatbot.id}/settings`)}
                      >
                        <Settings className="w-4 h-4 mr-2 text-zinc-500" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-xl cursor-pointer py-2.5 font-medium text-red-500 focus:text-red-500"
                        onClick={() => setDeleteId(chatbot.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardHeader className="p-8 pb-4">
                  <div className="space-y-4">
                    <Avatar className="w-16 h-16 rounded-3xl shadow-xl border-2 border-white">
                      <AvatarImage src={chatbot.avatar} className="object-cover" />
                      <AvatarFallback className="bg-zinc-100 rounded-3xl">
                        <Bot className="w-8 h-8 text-zinc-400" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 group-hover:text-primary transition-colors line-clamp-1">
                        {chatbot.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            chatbot.status === "ACTIVE" 
                            ? "bg-green-500/10 text-green-600 border-green-500/20" 
                            : chatbot.status === "TRAINING"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                            : "bg-zinc-100 text-zinc-500"
                          }`}
                          variant="outline"
                        >
                          {chatbot.status === "ACTIVE" ? "READY" : chatbot.status}
                        </Badge>

                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-0">
                  <p className="text-sm text-zinc-500 mb-8 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                    {chatbot.description || "Elite AI autonomous agent ready for deployment."}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50/50 rounded-2xl p-4 transition-colors group-hover:bg-white/80">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Conversations</span>
                      </div>
                      <span className="text-lg font-bold text-zinc-900">
                        {(chatbot._count?.conversations ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-zinc-50/50 rounded-2xl p-4 transition-colors group-hover:bg-white/80">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">System</span>
                      </div>
                      <span className={`text-xs font-bold ${chatbot.status === "ACTIVE" ? "text-green-600" : "text-amber-600"}`}>
                        {chatbot.status === "ACTIVE" ? "Operational" : "Synchronizing"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3">
                    <Button 
                      onClick={() => router.push(`/dashboard/chatbots/${chatbot.id}`)}
                      className="flex-1 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-2xl h-12 px-0 font-bold shadow-sm transition-all"
                    >
                      Enter Forge
                    </Button>
                    <Button 
                      onClick={() => router.push(`/dashboard/chatbots/${chatbot.id}/settings`)}
                      variant="outline"
                      className="rounded-2xl h-12 w-12 p-0 border-zinc-200 hover:bg-zinc-50 transition-all"
                    >
                      <Settings className="w-4 h-4 text-zinc-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Elite Add New Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (chatbots?.length || 0) * 0.05 + 0.1, duration: 0.5 }}
          >
            <Link href="/dashboard/chatbots/new" className="block h-full">
              <Card className="h-full flex flex-col items-center justify-center p-10 rounded-[40px] border-2 border-dashed border-zinc-200 hover:border-primary/50 hover:bg-primary/5 transition-all duration-500 cursor-pointer min-h-[360px] group">
                <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <Plus className="w-10 h-10 text-zinc-300 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-xl text-zinc-900">Forge New Mind</h3>
                <p className="text-sm text-zinc-400 text-center mt-3 font-medium max-w-[200px]">
                  Initialize a new autonomous intelligence unit
                </p>
              </Card>
            </Link>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[40px] border-muted/40 p-10 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Terminate Agent?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-base font-medium py-2">
              This action is irreversible. The chatbot's memory, data sources, and conversations will be permanently purged from the J.Caesar infrastructure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl h-12 px-8 font-bold border-zinc-200 hover:bg-zinc-50">Keep Agent</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-2xl h-12 px-8 font-bold bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20"
            >
              Confirm Termination
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
