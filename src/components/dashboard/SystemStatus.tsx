import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Server, CheckCircle2, AlertCircle, XCircle, Loader2, WifiOff } from "lucide-react";
import { useAgents } from "@/hooks/useSNSMData";

// Static services representing the SNSM architecture
const staticServices = [
  { id: "dumpcap", name: "Packet Capture (dumpcap)", baseLatency: 12 },
  { id: "zeek", name: "Flow Analyzer (Zeek)", baseLatency: 45 },
  { id: "suricata", name: "IDS Engine (Suricata)", baseLatency: 23 },
  { id: "nftables", name: "Firewall (nftables)", baseLatency: 8 },
  { id: "anomaly", name: "Anomaly Engine", baseLatency: 56 },
  { id: "correlation", name: "Correlation API", baseLatency: 34 },
  { id: "redis", name: "Redis Cache", baseLatency: 2 },
  { id: "loki", name: "Loki Logging", baseLatency: 67 },
];

const SystemStatus = () => {
  const { data: agents, isLoading } = useAgents();

  const hasOnlineAgents = agents?.some((a) => a.status === "online");
  const hasDegradedAgents = agents?.some((a) => a.status === "degraded");

  // Derive service status from agent data
  const services = staticServices.map((service) => {
    // Simulate service status based on agents
    let status: "online" | "warning" | "offline" = "offline";
    if (hasOnlineAgents) {
      status = "online";
    } else if (hasDegradedAgents) {
      status = "warning";
    }
    
    // Real latency would come from agent heartbeat
    const latency = hasOnlineAgents ? service.baseLatency : 0;
    
    return {
      ...service,
      status,
      latency,
      uptime: status === "online" ? "99.9%" : status === "warning" ? "98.5%" : "--",
    };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "offline":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return "text-success";
    if (latency < 100) return "text-warning";
    return "text-destructive";
  };

  const onlineCount = services.filter((s) => s.status === "online").length;

  if (isLoading) {
    return (
      <CyberCard
        title="System Services"
        icon={<Server className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Checking services...</span>
        </div>
      </CyberCard>
    );
  }

  // No agents connected state
  if (!hasOnlineAgents && !hasDegradedAgents) {
    return (
      <CyberCard
        title="System Services"
        icon={<Server className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <WifiOff className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-sm font-medium">No Agents Connected</p>
          <p className="text-xs mt-1 text-center max-w-xs">
            Services status unavailable. Deploy an SNSM agent to monitor system health.
          </p>
          
          {/* Grayed out service indicators */}
          <div className="mt-6 flex items-center gap-1">
            {staticServices.map((service) => (
              <div
                key={service.id}
                className="w-2 h-6 rounded-sm bg-muted/30"
                title={service.name}
              />
            ))}
          </div>
          <p className="text-xs mt-2 opacity-50">{staticServices.length} services awaiting connection</p>
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard
      title="System Services"
      icon={<Server className="w-4 h-4" />}
      className="h-full"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="text-success font-mono">{onlineCount}</span>
          <span className="mx-1">/</span>
          <span className="font-mono">{services.length}</span>
          <span className="ml-1">services operational</span>
        </div>
        <div className="flex items-center gap-1">
          {services.map((service) => (
            <motion.div
              key={service.id}
              className="w-2 h-6 rounded-sm"
              style={{
                backgroundColor:
                  service.status === "online"
                    ? "hsl(var(--success))"
                    : service.status === "warning"
                    ? "hsl(var(--warning))"
                    : "hsl(var(--destructive))",
              }}
              animate={{
                opacity: service.status === "offline" ? [1, 0.3, 1] : 1,
              }}
              transition={{
                duration: 0.5,
                repeat: service.status === "offline" ? Infinity : 0,
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {services.map((service) => (
          <motion.div
            key={service.id}
            className="flex items-center justify-between p-2 rounded border border-primary/10 bg-background/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(service.status)}
              <span className="text-sm text-foreground">{service.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className={getLatencyColor(service.latency)}>
                {service.latency}ms
              </span>
              <span className="text-muted-foreground w-14 text-right">
                {service.uptime}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </CyberCard>
  );
};

export default SystemStatus;
