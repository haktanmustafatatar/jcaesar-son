"use client";

import { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, MessageSquare, Loader2, FileText, Type, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
interface SourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "WEBSITE" | "TEXT" | "FILE" | "QA" | null;
  chatbotId: string;
  onSuccess: () => void;
  editMode?: boolean;
  initialData?: any;
}

export function SourceDialog({ 
  open, 
  onOpenChange, 
  type, 
  chatbotId,
  onSuccess,
  editMode,
  initialData
}: SourceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [qnaList, setQnaList] = useState([{ question: "", answer: "" }]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open && editMode && initialData) {
      setName(initialData.name || "");
      setUrl(initialData.url || "");
      if (initialData.settings) {
        setContent(initialData.settings.content || "");
        setQnaList(initialData.settings.qnaList || [{ question: "", answer: "" }]);
      }
    } else if (open && !editMode) {
      setName("");
      setUrl("");
      setContent("");
      setQnaList([{ question: "", answer: "" }]);
    }
  }, [open, editMode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let payload: any;
      
      if (type === "WEBSITE") {
        payload = { type, name: name || "Website Source", url };
      } else if (type === "TEXT") {
        payload = { type, name: name || "Manual Text", content };
      } else if (type === "QA") {
        payload = { type, name: name || "Q&A Knowledge", qnaList: qnaList.filter(q => q.question.trim()) };
      } else if (type === "FILE") {
        if (!editMode) {
          if (selectedFiles.length === 0) {
            toast.error("Please select a file first");
            setIsLoading(false);
            return;
          }

          const formData = new FormData();
          formData.append("file", selectedFiles[0]);
          formData.append("chatbotId", chatbotId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            toast.success("File uploaded successfully");
            onSuccess();
            onOpenChange(false);
            setSelectedFiles([]);
          } else {
            const error = await res.json();
            toast.error(error.error || "Failed to upload file");
          }
          setIsLoading(false);
          return;
        } else {
           // For file sources in edit mode, maybe just update name?
           payload = { type, name: name || initialData.name };
        }
      }

      const method = editMode ? "PATCH" : "POST";
      const endpoint = editMode 
        ? `/api/chatbots/${chatbotId}/data-sources/${initialData.id}` 
        : `/api/chatbots/${chatbotId}/data-sources`;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`${type} source ${editMode ? 'updated' : 'added'} successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        toast.error(error.error || `Failed to ${editMode ? 'update' : 'add'} source`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    const prefix = editMode ? "Edit" : "Add";
    switch (type) {
      case "WEBSITE": return `${prefix} Website Source`;
      case "TEXT": return `${prefix} Text Source`;
      case "FILE": return `${prefix} Documents`;
      case "QA": return `${prefix} Q&A Knowledge`;
      default: return `${prefix} Knowledge Source`;
    }
  };

  const getIcon = () => {
    const className = "w-5 h-5 text-white";
    switch (type) {
      case "WEBSITE": return <Globe className={className} />;
      case "TEXT": return <Type className={className} />;
      case "FILE": return <FileText className={className} />;
      case "QA": return <MessageSquare className={className} />;
      default: return <Globe className={className} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "WEBSITE": return "bg-blue-500";
      case "TEXT": return "bg-purple-500";
      case "FILE": return "bg-orange-500";
      case "QA": return "bg-emerald-500";
      default: return "bg-zinc-950";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[40px] border-muted/40 p-8 max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getBgColor()}`}>
              {getIcon()}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{getTitle()}</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                {type === "WEBSITE" ? "Crawl pages and sitemaps." : 
                 type === "TEXT" ? "Paste content directly." :
                 type === "FILE" ? "Upload PDF, DOCX or TXT files." : "Manual question & answer pairs."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Knowledge Title</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium"
              placeholder="e.g., Company Pricing Info"
            />
          </div>

          {type === "WEBSITE" && (
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Website URL</Label>
              <Input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium"
                placeholder="https://example.com"
              />
            </div>
          )}

          {type === "TEXT" && (
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Content</Label>
              <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="min-h-[200px] rounded-2xl bg-zinc-50 border-zinc-100 focus:bg-white transition-all font-medium resize-none p-6"
                placeholder="Paste knowledge here..."
              />
            </div>
          )}

          {type === "FILE" && (
             <div className="space-y-3">
                <div 
                  className="h-40 rounded-3xl border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-zinc-950 transition-all bg-zinc-50"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                   <Plus className="w-8 h-8 text-zinc-400" />
                   <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Files</span>
                   <input 
                     id="file-input" 
                     type="file" 
                     multiple 
                     className="hidden" 
                     onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))} 
                   />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="px-4 py-2 bg-zinc-100 rounded-xl text-[10px] font-bold text-zinc-600 flex justify-between">
                         <span>{f.name}</span>
                         <span>{(f.size/1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}

          {type === "QA" && (
            <div className="space-y-4">
               {qnaList.map((qa, idx) => (
                 <div key={idx} className="p-4 bg-zinc-50 rounded-3xl border space-y-3 relative group">
                    <Input 
                      placeholder="Question" 
                      className="bg-white rounded-xl h-10 border-none shadow-sm text-xs font-bold"
                      value={qa.question}
                      onChange={(e) => {
                        const newList = [...qnaList];
                        newList[idx].question = e.target.value;
                        setQnaList(newList);
                      }}
                    />
                    <Textarea 
                      placeholder="Answer" 
                      className="bg-white rounded-xl min-h-[80px] border-none shadow-sm text-xs font-medium"
                      value={qa.answer}
                      onChange={(e) => {
                        const newList = [...qnaList];
                        newList[idx].answer = e.target.value;
                        setQnaList(newList);
                      }}
                    />
                    {qnaList.length > 1 && (
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setQnaList(qnaList.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                 </div>
               ))}
               <Button 
                 type="button"
                 variant="outline" 
                 className="w-full rounded-2xl h-12 border-dashed border-2 border-zinc-200 hover:border-zinc-950 font-black text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-950"
                 onClick={() => setQnaList([...qnaList, { question: "", answer: "" }])}
               >
                 <Plus className="w-4 h-4 mr-2" /> Add Question
               </Button>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-2xl h-12 px-8 font-bold text-zinc-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-zinc-950 hover:bg-zinc-900 text-white rounded-2xl h-14 px-10 font-bold shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editMode ? "Update Knowledge Source" : "Save Intelligence Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
