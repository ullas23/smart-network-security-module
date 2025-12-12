import { motion, AnimatePresence } from "framer-motion";
import ThreatBadge from "@/components/ui/ThreatBadge";
import CyberCard from "@/components/ui/CyberCard";
import { AlertTriangle, Shield, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAlerts } from "@/hooks/useSNSMData";

const AlertsFeed = () => {
  const { data: alerts, isLoading, error } = useAlerts(50);

  const getThreatLevel = (severity: string | null) => {
    switch (severity) {
      case "critical":
        return "critical";
      case "high":
        return "high";
      case "medium":
        return "medium";
      case "low":
        return "low";
      default:
        return "info";
    }
  };

  if (isLoading) {
    return (
      <CyberCard
        title="Live Threat Feed"
        icon={<AlertTriangle className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading alerts...</span>
        </div>
      </CyberCard>
    );
  }

  if (error) {
    return (
      <CyberCard
        title="Live Threat Feed"
        icon={<AlertTriangle className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64 text-destructive">
          Failed to load alerts
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard
      title="Live Threat Feed"
      icon={<AlertTriangle className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
        {(!alerts || alerts.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Shield className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No Live Alerts</p>
            <p className="text-xs mt-1 text-center">
              Deploy an SNSM agent to capture real security events
            </p>
            <div className="mt-3 px-3 py-1.5 rounded border border-primary/20 bg-primary/5 text-xs">
              Waiting for agent data...
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {alerts.slice(0, 20).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border border-primary/10 rounded bg-background/50 p-3 hover:bg-primary/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ThreatBadge
                        level={getThreatLevel(alert.severity)}
                        pulse={alert.severity === "critical"}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {alert.category || alert.event_type}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-glow">
                      {alert.signature_name || "Network Alert"}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {alert.src_ip} → {alert.dst_ip}
                      </span>
                      <span>{alert.protocol}:{alert.dst_port}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp && format(new Date(alert.timestamp), "HH:mm:ss")}
                    </div>
                    <div className="text-primary/60 mt-1 font-mono text-[10px]">
                      {alert.signature_id || "N/A"}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </CyberCard>
  );
};

export default AlertsFeed;
