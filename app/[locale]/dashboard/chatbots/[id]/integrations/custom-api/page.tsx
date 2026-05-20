"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Cpu, 
  Save, 
  Code2, 
  BookOpen, 
  TerminalSquare, 
  Server, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CustomApiPage() {
  const t = useTranslations();
  const params = useParams();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  
  const [webhook, setWebhook] = useState({
    name: "Check Order Status",
    description: "Use this API to check the delivery status of a customer's order using their Order ID.",
    method: "POST",
    url: "https://api.yourdomain.com/v1/orders/status",
    headers: "{\n  \"Authorization\": \"Bearer YOUR_API_KEY\",\n  \"Content-Type\": \"application/json\"\n}",
    body: "{\n  \"orderId\": \"{{user_input}}\"\n}"
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate saving to Channel config
      const res = await fetch(`/api/chatbots/${id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CUSTOM_API",
          name: webhook.name,
          config: {
            description: webhook.description,
            method: webhook.method,
            url: webhook.url,
            headers: JSON.parse(webhook.headers),
            body: JSON.parse(webhook.body)
          },
          status: "CONNECTED"
        })
      });

      if (res.ok) {
        toast.success("Custom API integration saved successfully!");
      } else {
        toast.error("Failed to save integration. Please check your JSON formatting.");
      }
    } catch (error) {
      toast.error("Invalid JSON format in headers or body.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-40 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6">
        <Link href={`/dashboard/chatbots/${id}/integrations`}>
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl hover:bg-zinc-100 bg-white">
            <ArrowLeft className="w-5 h-5 text-zinc-900" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">Custom API (Webhooks)</h1>
          <p className="text-zinc-500 font-medium">Connect external data sources & trigger real-time actions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* API CONFIGURATION FORM */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl shadow-zinc-200/50 overflow-hidden bg-white">
            <CardHeader className="bg-zinc-50 border-b border-zinc-100 p-8">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-500" /> Endpoint Configuration
              </CardTitle>
              <CardDescription>Define how the AI Agent should interact with your API.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Action Name</Label>
                <Input 
                  value={webhook.name}
                  onChange={e => setWebhook({...webhook, name: e.target.value})}
                  className="h-12 rounded-xl bg-zinc-50 font-medium" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">AI Prompt / Description</Label>
                <p className="text-[11px] text-zinc-400 mb-2">Tell the AI EXACTLY when it should use this API (e.g., "Use this when the user asks for their order status").</p>
                <Textarea 
                  value={webhook.description}
                  onChange={e => setWebhook({...webhook, description: e.target.value})}
                  className="rounded-xl bg-zinc-50 font-medium min-h-[80px] resize-none" 
                />
              </div>

              <div className="flex gap-4">
                <div className="w-1/3 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Method</Label>
                  <Select value={webhook.method} onValueChange={(val) => setWebhook({...webhook, method: val})}>
                    <SelectTrigger className="h-12 rounded-xl bg-zinc-50 font-bold">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">URL Endpoint</Label>
                  <Input 
                    value={webhook.url}
                    onChange={e => setWebhook({...webhook, url: e.target.value})}
                    placeholder="https://api.example.com/data" 
                    className="h-12 rounded-xl bg-zinc-50 font-mono text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Headers (JSON)</Label>
                <Textarea 
                  value={webhook.headers}
                  onChange={e => setWebhook({...webhook, headers: e.target.value})}
                  className="rounded-xl bg-zinc-950 text-emerald-400 font-mono text-sm min-h-[120px]" 
                />
              </div>

              {webhook.method !== "GET" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Body Payload (JSON)</Label>
                  <Textarea 
                    value={webhook.body}
                    onChange={e => setWebhook({...webhook, body: e.target.value})}
                    className="rounded-xl bg-zinc-950 text-indigo-400 font-mono text-sm min-h-[120px]" 
                  />
                </div>
              )}

              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isLoading ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Integration</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* DEVELOPER GUIDE SIDEBAR */}
        <div className="space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl shadow-zinc-200/50 bg-indigo-600 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <CardHeader className="p-8 pb-4 relative z-10">
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Developer Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6 relative z-10 text-indigo-50">
              <p className="text-sm leading-relaxed">
                Custom APIs allow the AI Agent to perform actions on your behalf or fetch dynamic data during a conversation.
              </p>
              
              <div className="space-y-4">
                <div className="bg-indigo-950/30 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Code2 className="w-4 h-4" /> 1. Dynamic Variables
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">
                    You can use <code className="bg-black/30 px-1.5 py-0.5 rounded">{"{{variable_name}}"}</code> in your URL or Body. The AI will intelligently extract this value from the user's message and replace it before sending the request.
                  </p>
                </div>

                <div className="bg-indigo-950/30 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <TerminalSquare className="w-4 h-4" /> 2. Expected Response
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">
                    Your API must return a valid JSON response within 10 seconds. The AI will read the JSON and formulate a natural language response for the user.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <h4 className="font-bold text-white mb-2 text-sm">Example Workflow:</h4>
                <ol className="text-xs space-y-2 opacity-90 list-decimal list-inside">
                  <li>User: "Where is my order #12345?"</li>
                  <li>AI maps "12345" to {"{{orderId}}"}</li>
                  <li>AI sends POST request to your API</li>
                  <li>Your API returns: <code className="block bg-black/30 p-2 mt-1 rounded text-emerald-300">{"{\"status\": \"Shipped\"}"}</code></li>
                  <li>AI replies: "Your order is currently shipped!"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
