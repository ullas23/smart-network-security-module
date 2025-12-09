import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, generateAlert, initialAlerts } from "@/data/mockAlerts";
import ThreatBadge from "@/components/ui/ThreatBadge";
import CyberCard from "@/components/ui/CyberCard";
import { AlertTriangle, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

const AlertsFeed = () => {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts((prev) => [generateAlert(), ...prev.slice(0, 49)]);
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CyberCard
      title="Live Threat Feed"
      icon={<AlertTriangle className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
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
                      level={alert.threatLevel}
                      pulse={alert.threatLevel === "critical"}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {alert.classification}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-foreground truncate group-hover:text-glow">
                    {alert.type}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {alert.source} → {alert.destination}
                    </span>
                    <span>{alert.protocol}:{alert.port}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(alert.timestamp, "HH:mm:ss")}
                  </div>
                  <div className="text-primary/60 mt-1 font-mono text-[10px]">
                    {alert.signature}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </CyberCard>
  );
};

export default AlertsFeed;
