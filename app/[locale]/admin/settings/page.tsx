"use client";

import { 
  Settings2, 
  Shield, 
  Mail, 
  Globe, 
  CreditCard, 
  Save, 
  Database,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const settingsGroups = [
  { id: "general", label: "General Settings", icon: Globe },
  { id: "security", label: "Security & Auth", icon: Shield },
  { id: "billing", label: "Revenue & Billing", icon: CreditCard },
  { id: "infrastructure", label: "Infrastructure", icon: Database },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">System Settings</h1>
          <p className="text-zinc-400">Configure global platform parameters and rules</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white px-6">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          {settingsGroups.map((group) => (
            <Button 
              key={group.id} 
              variant="ghost" 
              className="w-full justify-start text-zinc-400 hover:text-white"
            >
              <group.icon className="w-4 h-4 mr-2" />
              {group.label}
            </Button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader className="border-b border-white/10 bg-zinc-950/50">
              <CardTitle className="text-white text-lg">General Platform Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label className="text-white">Site Name</Label>
                  <Input defaultValue="JCaesar AI" className="bg-zinc-950 border-white/10" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white">Admin Email</Label>
                  <Input defaultValue="admin@jcaesar.agent" type="email" className="bg-zinc-950 border-white/10" />
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                <h4 className="text-sm font-medium text-white mb-2">Platform Features</h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950">
                  <div className="space-y-0.5">
                    <p className="text-sm text-white font-medium">New Registrations</p>
                    <p className="text-xs text-zinc-500">Allow new users to sign up to the platform</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950">
                  <div className="space-y-0.5">
                    <p className="text-sm text-white font-medium">Auto-approve Bots</p>
                    <p className="text-xs text-zinc-500">Automatically activate newly created chatbots</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/10">
            <CardHeader className="border-b border-white/10 bg-zinc-950/50">
              <CardTitle className="text-white text-lg">API & Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
                <Lock className="w-5 h-5 text-yellow-500" />
                <p className="text-xs text-yellow-500/80">
                  Changing infrastructure settings requires a server restart to take effect.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label className="text-white">Global Rate Limit</Label>
                  <Input defaultValue="1000/hour" className="bg-zinc-950 border-white/10" />
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
