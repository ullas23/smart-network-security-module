import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Server, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface SystemService {
  id: string;
  name: string;
  status: "online" | "warning" | "offline";
  latency: number;
  uptime: string;
}

const initialServices: SystemService[] = [
  { id: "1", name: "Packet Capture (dumpcap)", status: "online", latency: 12, uptime: "99.9%" },
  { id: "2", name: "Flow Analyzer (Zeek)", status: "online", latency: 45, uptime: "99.8%" },
  { id: "3", name: "IDS Engine (Suricata)", status: "online", latency: 23, uptime: "99.9%" },
  { id: "4", name: "Firewall (nftables)", status: "online", latency: 8, uptime: "100%" },
  { id: "5", name: "Anomaly Engine", status: "warning", latency: 156, uptime: "98.5%" },
  { id: "6", name: "Correlation API", status: "online", latency: 34, uptime: "99.7%" },
  { id: "7", name: "Redis Cache", status: "online", latency: 2, uptime: "99.99%" },
  { id: "8", name: "Loki Logging", status: "online", latency: 67, uptime: "99.5%" },
];

const SystemStatus = () => {
  const [services, setServices] = useState<SystemService[]>(initialServices);

  useEffect(() => {
    const interval = setInterval(() => {
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          latency: Math.max(
            1,
            service.latency + Math.floor(Math.random() * 20 - 10)
          ),
          status:
            Math.random() > 0.98
              ? "warning"
              : Math.random() > 0.995
              ? "offline"
              : service.status === "offline" && Math.random() > 0.5
              ? "online"
              : service.status,
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
