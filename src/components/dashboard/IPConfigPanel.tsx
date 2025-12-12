import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, Server, Play, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgentConfig, useSimulatedTraffic } from "@/hooks/useAgentConfig";

interface IPConfigPanelProps {
  onConnectionChange?: (connected: boolean, agentId: string | null) => void;
}

const IPConfigPanel = ({ onConnectionChange }: IPConfigPanelProps) => {
  const [ipAddress, setIpAddress] = useState("");
  const [hostname, setHostname] = useState("");
  const [enableSimulation, setEnableSimulation] = useState(true);
  
  const { config, isConnecting, isConnected, registerAgent, disconnect } = useAgentConfig();
  const { simulateTraffic } = useSimulatedTraffic(config?.agentId || null, enableSimulation && isConnected);

  // Start traffic simulation when connected
  useEffect(() => {
    if (!isConnected || !enableSimulation) return;
    
    const interval = setInterval(simulateTraffic, 3000);
    return () => clearInterval(interval);
  }, [isConnected, enableSimulation, simulateTraffic]);

  // Notify parent of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected, config?.agentId || null);
  }, [isConnected, config?.agentId, onConnectionChange]);

  const handleConnect = async () => {
    if (!ipAddress) return;
    const host = hostname || `agent-${Date.now()}`;
    await registerAgent(ipAddress, host);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isValidIP = (ip: string) => {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return pattern.test(ip);
  };

  return (
    <CyberCard
      title="Network Configuration"
      icon={<Wifi className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-3 p-3 rounded border border-primary/20 bg-background/50">
          <motion.div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-success" : isConnecting ? "bg-warning" : "bg-muted"
            }`}
            animate={isConnected ? {
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
              {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
            </div>
            {config && (
              <div className="text-xs text-muted-foreground font-mono">
                {config.targetIP} • {config.agentId.slice(0, 8)}...
              </div>
            )}
          </div>
          {isConnected && (
            <CheckCircle2 className="w-5 h-5 text-success" />
          )}
        </div>

        {/* IP Input */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Target IP Address
          </label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="192.168.1.1"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              disabled={isConnected || isConnecting}
              className="pl-10 font-mono bg-background border-primary/20 focus:border-primary"
            />
            {ipAddress && !isValidIP(ipAddress) && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
        </div>

        {/* Hostname Input */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Agent Hostname (Optional)
          </label>
          <Input
            type="text"
            placeholder="my-workstation"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            disabled={isConnected || isConnecting}
            className="font-mono bg-background border-primary/20 focus:border-primary"
          />
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
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={!ipAddress || !isValidIP(ipAddress) || isConnecting}
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

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          {isConnected
            ? "Real-time network analysis active. Traffic data streaming to dashboard."
            : "Enter the IP address of the network node to monitor."}
        </p>
      </div>
    </CyberCard>
  );
};

export default IPConfigPanel;
