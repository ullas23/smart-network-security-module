import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, Server, Play, Square, Loader2, CheckCircle2, AlertCircle, RefreshCw, Shield } from "lucide-react";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { useAgentConfig, useSimulatedTraffic } from "@/hooks/useAgentConfig";

interface IPConfigPanelProps {
  onConnectionChange?: (connected: boolean, agentId: string | null) => void;
}

const IPConfigPanel = ({ onConnectionChange }: IPConfigPanelProps) => {
  const { session, isLoading: sessionLoading, ip: detectedIp, isPrivateIp, isVpnDetected, agentId: sessionAgentId, monitoringEnabled, refreshSession } = useSession();
  const [manualIp, setManualIp] = useState("");
  const [enableSimulation, setEnableSimulation] = useState(true);
  
  const { config, isConnecting, isConnected, registerAgent, disconnect } = useAgentConfig();
  const { simulateTraffic } = useSimulatedTraffic(config?.agentId || sessionAgentId || null, enableSimulation && (isConnected || monitoringEnabled));

  // Use detected IP as default
  useEffect(() => {
    if (detectedIp && !isPrivateIp && !manualIp) {
      setManualIp(detectedIp);
    }
  }, [detectedIp, isPrivateIp, manualIp]);

  // Start traffic simulation when connected
  useEffect(() => {
    if ((!isConnected && !monitoringEnabled) || !enableSimulation) return;
    
    const interval = setInterval(simulateTraffic, 3000);
    return () => clearInterval(interval);
  }, [isConnected, monitoringEnabled, enableSimulation, simulateTraffic]);

  // Notify parent of connection changes
  useEffect(() => {
    const connected = isConnected || monitoringEnabled;
    const activeAgentId = config?.agentId || sessionAgentId;
    onConnectionChange?.(connected, activeAgentId);
  }, [isConnected, monitoringEnabled, config?.agentId, sessionAgentId, onConnectionChange]);

  const handleConnect = async () => {
    const ipToUse = manualIp || detectedIp;
    if (!ipToUse) return;
    const host = `agent-${Date.now()}`;
    await registerAgent(ipToUse, host);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isValidIP = (ip: string) => {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return pattern.test(ip);
  };

  const effectivelyConnected = isConnected || monitoringEnabled;
  const currentIp = config?.targetIP || (monitoringEnabled ? detectedIp : null);

  return (
    <CyberCard
      title="Network Configuration"
      icon={<Wifi className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Auto-detected IP Status */}
        <div className="p-3 rounded border border-primary/20 bg-background/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Auto-Detected IP</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSession}
              disabled={sessionLoading}
              className="h-6 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${sessionLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {sessionLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Detecting IP...</span>
            </div>
          ) : detectedIp ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary">{detectedIp}</span>
                {isPrivateIp && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">Private</span>
                )}
                {isVpnDetected && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-info/20 text-info">VPN</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPrivateIp 
                  ? "Private IP - Enter public IP below for monitoring"
                  : "Public IP detected - Ready for monitoring"
                }
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              Detection failed
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-3 p-3 rounded border border-primary/20 bg-background/50">
          <motion.div
            className={`w-3 h-3 rounded-full ${
              effectivelyConnected ? "bg-success" : isConnecting ? "bg-warning" : "bg-muted"
            }`}
            animate={effectivelyConnected ? {
              boxShadow: [
                "0 0 5px hsl(var(--success))",
                "0 0 15px hsl(var(--success))",
                "0 0 5px hsl(var(--success))",
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {effectivelyConnected ? "Monitoring Active" : isConnecting ? "Connecting..." : "Standby"}
            </div>
            {currentIp && (
              <div className="text-xs text-muted-foreground font-mono">
                Target: {currentIp}
              </div>
            )}
          </div>
          {effectivelyConnected && (
            <Shield className="w-5 h-5 text-success" />
          )}
        </div>

        {/* Manual IP Override */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Target IP (Override)
          </label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={detectedIp || "192.168.1.1"}
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              disabled={effectivelyConnected || isConnecting}
              className="pl-10 font-mono bg-background border-primary/20 focus:border-primary"
            />
            {manualIp && !isValidIP(manualIp) && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-3 p-3 rounded border border-primary/20 bg-background/50">
          <input
            type="checkbox"
            id="simulation-mode"
            checked={enableSimulation}
            onChange={(e) => setEnableSimulation(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="simulation-mode" className="text-sm flex-1">
            Enable Demo Traffic Simulation
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!effectivelyConnected ? (
            <Button
              onClick={handleConnect}
              disabled={(!manualIp && !detectedIp) || (manualIp && !isValidIP(manualIp)) || isConnecting}
              className="flex-1 bg-primary hover:bg-primary/80"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Monitoring
            </Button>
          )}
        </div>

        {/* Status Message */}
        <p className="text-xs text-muted-foreground text-center">
          {effectivelyConnected
            ? "Real-time network analysis active. Traffic data streaming to dashboard."
            : sessionLoading
            ? "Detecting network configuration..."
            : "Click Start to begin monitoring your network."}
        </p>
      </div>
    </CyberCard>
  );
};

export default IPConfigPanel;
