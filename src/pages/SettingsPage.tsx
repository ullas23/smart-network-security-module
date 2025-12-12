import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Shield, Bell, Database, Key, Moon, Sun, Save, RefreshCw, CheckCircle2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    darkMode: true,
    notifications: true,
    autoBlock: true,
    threatThreshold: 70,
    dataRetention: 30,
    demoMode: true,
  });

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <MatrixRain />
      <div className="fixed inset-0 pointer-events-none scanlines z-10" />

      <div className="relative z-20 flex w-full">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header />

          <main className="flex-1 p-6 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-bold text-primary text-glow mb-2">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure SNSM platform preferences and security policies
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CyberCard title="General" icon={<Settings className="w-4 h-4" />}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Dark Mode</Label>
                        <p className="text-xs text-muted-foreground">Use dark theme for the interface</p>
                      </div>
                      <Switch
                        checked={settings.darkMode}
                        onCheckedChange={(checked) => setSettings({...settings, darkMode: checked})}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Demo Mode</Label>
                        <p className="text-xs text-muted-foreground">Enable simulated traffic for testing</p>
                      </div>
                      <Switch
                        checked={settings.demoMode}
                        onCheckedChange={(checked) => setSettings({...settings, demoMode: checked})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Data Retention (days)</Label>
                      <Input
                        type="number"
                        value={settings.dataRetention}
                        onChange={(e) => setSettings({...settings, dataRetention: parseInt(e.target.value) || 30})}
                        className="bg-background border-primary/20"
                      />
                      <p className="text-xs text-muted-foreground">How long to keep historical data</p>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>

              {/* Security Settings */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CyberCard title="Security" icon={<Shield className="w-4 h-4" />}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Auto-Block Threats</Label>
                        <p className="text-xs text-muted-foreground">Automatically block high-risk IPs</p>
                      </div>
                      <Switch
                        checked={settings.autoBlock}
                        onCheckedChange={(checked) => setSettings({...settings, autoBlock: checked})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Threat Score Threshold</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.threatThreshold}
                        onChange={(e) => setSettings({...settings, threatThreshold: parseInt(e.target.value) || 70})}
                        className="bg-background border-primary/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Score above which IPs are auto-blocked (0-100)
                      </p>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>

              {/* Notifications */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CyberCard title="Notifications" icon={<Bell className="w-4 h-4" />}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive alerts for security events</p>
                      </div>
                      <Switch
                        checked={settings.notifications}
                        onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
                      />
                    </div>

                    <div className="p-3 rounded border border-info/20 bg-info/5">
                      <div className="flex items-start gap-2">
                        <Bell className="w-4 h-4 text-info mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          Notifications will be shown for critical and high severity alerts.
                          Configure email/SMS alerts in the API settings.
                        </div>
                      </div>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>

              {/* API Configuration */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <CyberCard title="API Configuration" icon={<Key className="w-4 h-4" />}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">API Endpoint</Label>
                      <Input
                        value="https://rdvlqdztvdblqlendjyi.supabase.co"
                        disabled
                        className="bg-background/50 border-primary/20 font-mono text-xs"
                      />
                    </div>

                    <div className="p-3 rounded border border-success/20 bg-success/5">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          Connected to Lovable Cloud backend. Edge functions are automatically deployed.
                        </div>
                      </div>
                    </div>
                  </div>
                </CyberCard>
              </motion.div>
            </div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex justify-end gap-4"
            >
              <Button variant="outline" className="border-primary/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/80">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;