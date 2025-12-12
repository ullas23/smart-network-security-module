import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wifi, Server, Play, Square, Loader2, CheckCircle2, AlertCircle, RefreshCw, Shield, Activity } from "lucide-react";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { useAgentConfig, useSimulatedTraffic } from "@/hooks/useAgentConfig";

interface IPConfigPanelProps {
  onConnectionChange?: (connected: boolean, agentId: string | null) => void;
}

const IPConfigPanel = ({ onConnectionChange }: IPConfigPanelProps) => {
  const { 
    session, 
    isLoading: sessionLoading, 
    ip: detectedIp, 
    isPrivateIp, 
    isVpnDetected, 
    agentId: sessionAgentId, 
    monitoringEnabled, 
    refreshSession 
  } = useSession();
  
  const [manualIp, setManualIp] = useState("");
  const [enableSimulation, setEnableSimulation] = useState(false);
  const [trafficCount, setTrafficCount] = useState(0);
  
  const { config, isConnecting, isConnected, registerAgent, disconnect } = useAgentConfig();
  
  // Determine the active agent ID
  const activeAgentId = config?.agentId || sessionAgentId || null;
  const effectivelyConnected = isConnected || monitoringEnabled;
  
  const { simulateTraffic } = useSimulatedTraffic(activeAgentId, enableSimulation && effectivelyConnected);

  // Use detected IP as default
  useEffect(() => {
    if (detectedIp && !manualIp) {
      setManualIp(detectedIp);
    }
  }, [detectedIp, manualIp]);

  // Traffic simulation interval
  useEffect(() => {
    if (!effectivelyConnected || !enableSimulation || !activeAgentId) return;
    
    console.log('[SNSM] Starting traffic simulation for agent:', activeAgentId);
    
    // Immediate first simulation
    simulateTraffic().then(() => setTrafficCount(c => c + 1));
    
    const interval = setInterval(() => {
      simulateTraffic().then(() => setTrafficCount(c => c + 1));
    }, 3000);
    
    return () => {
      console.log('[SNSM] Stopping traffic simulation');
      clearInterval(interval);
    };
  }, [effectivelyConnected, enableSimulation, activeAgentId, simulateTraffic]);

  // Notify parent of connection changes
  useEffect(() => {
    onConnectionChange?.(effectivelyConnected, activeAgentId);
  }, [effectivelyConnected, activeAgentId, onConnectionChange]);

  const handleConnect = useCallback(async () => {
    const ipToUse = manualIp || detectedIp;
    if (!ipToUse) {
      console.error('[SNSM] No IP available for connection');
      return;
    }
    const host = `agent-${Date.now()}`;
    console.log('[SNSM] Connecting with IP:', ipToUse, 'Host:', host);
    try {
      await registerAgent(ipToUse, host);
    } catch (error) {
      console.error('[SNSM] Connection failed:', error);
    }
  }, [manualIp, detectedIp, registerAgent]);

  const handleDisconnect = useCallback(() => {
    console.log('[SNSM] Disconnecting...');
    setTrafficCount(0);
    disconnect();
  }, [disconnect]);

  const isValidIP = (ip: string) => {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return pattern.test(ip);
  };

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
              Detection failed - Enter IP manually
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
            {activeAgentId && effectivelyConnected && (
              <div className="text-xs text-muted-foreground font-mono">
                Agent: {activeAgentId.slice(0, 8)}...
              </div>
            )}
          </div>
          {effectivelyConnected && (
            <Shield className="w-5 h-5 text-success" />
          )}
        </div>

        {/* Traffic Activity Indicator */}
        {effectivelyConnected && enableSimulation && (
          <div className="flex items-center gap-3 p-3 rounded border border-success/20 bg-success/5">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            <div className="flex-1">
              <div className="text-sm font-medium text-success">Traffic Simulation Active</div>
              <div className="text-xs text-muted-foreground">
                {trafficCount} batches sent • Flows, alerts, and threat scores updating
              </div>
            </div>
          </div>
        )}

        {/* Manual IP Override */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Target IP {effectivelyConnected ? "(locked)" : "(Override)"}
          </label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={detectedIp || "Enter IP address"}
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              disabled={effectivelyConnected || isConnecting}
              className="pl-10 font-mono bg-background border-primary/20 focus:border-primary"
            />
            {manualIp && !isValidIP(manualIp) && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
            {manualIp && isValidIP(manualIp) && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
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
            className="w-4 h-4 accent-primary cursor-pointer"
          />
          <label htmlFor="simulation-mode" className="text-sm flex-1 cursor-pointer">
            Enable Demo Traffic Simulation
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!effectivelyConnected ? (
            <Button
              onClick={handleConnect}
              disabled={(!manualIp && !detectedIp) || (manualIp && !isValidIP(manualIp)) || isConnecting || sessionLoading}
              className="flex-1 bg-primary hover:bg-primary/80"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : sessionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting IP...
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
            ? `Real-time network analysis active. Agent ID: ${activeAgentId?.slice(0, 8)}...`
            : sessionLoading
            ? "Detecting network configuration..."
            : "Click Start to begin monitoring your network."}
        </p>

        {/* Verification Steps */}
        {effectivelyConnected && (
          <div className="mt-4 p-3 rounded border border-primary/20 bg-background/50">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Verification Checklist
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-success" />
                IP detected: {currentIp}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-success" />
                Agent registered: {activeAgentId?.slice(0, 8)}...
              </li>
              <li className="flex items-center gap-2">
                {enableSimulation ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-warning" />
                )}
                Demo traffic: {enableSimulation ? "Active" : "Disabled"}
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-primary" />
                Check dashboard panels for live data
              </li>
            </ul>
          </div>
        )}
      </div>
    </CyberCard>
  );
};

export default IPConfigPanel;