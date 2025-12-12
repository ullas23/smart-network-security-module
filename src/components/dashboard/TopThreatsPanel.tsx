import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import ThreatBadge from "@/components/ui/ThreatBadge";
import { Crosshair, Globe, Loader2 } from "lucide-react";
import { useThreatScores } from "@/hooks/useSNSMData";

const TopThreatsPanel = () => {
  const { data: threatScores, isLoading, error } = useThreatScores(10);

  const getThreatLevel = (score: number) => {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    if (score >= 20) return "low";
    return "info";
  };

  const getClassification = (score: number) => {
    if (score >= 90) return "Critical - Auto Block";
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Medium Risk";
    if (score >= 20) return "Low Risk";
    return "Benign";
  };

  if (isLoading) {
    return (
      <CyberCard
        title="Top Threat Sources"
        icon={<Crosshair className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading threats...</span>
        </div>
      </CyberCard>
    );
  }

  if (error) {
    return (
      <CyberCard
        title="Top Threat Sources"
        icon={<Crosshair className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64 text-destructive">
          Failed to load threat data
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard
      title="Top Threat Sources"
      icon={<Crosshair className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-2">
        {(!threatScores || threatScores.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Globe className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No threat sources detected</p>
            <p className="text-xs">All monitored IPs appear safe</p>
          </div>
        ) : (
          threatScores.map((threat, index) => (
            <motion.div
              key={threat.id}
              className="flex items-center gap-3 p-2 rounded border border-primary/10 bg-background/50 hover:bg-primary/5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="text-xs text-muted-foreground w-4">#{index + 1}</div>

              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm text-foreground truncate">
                  {threat.ip_address}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground hidden md:block">
                  {threat.classification || getClassification(threat.combined_score || 0)}
                </span>

                <div className="w-20">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            (threat.combined_score || 0) >= 80
                              ? "hsl(var(--destructive))"
                              : (threat.combined_score || 0) >= 50
                              ? "hsl(var(--warning))"
                              : "hsl(var(--primary))",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${threat.combined_score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">
                      {(threat.combined_score || 0).toFixed(0)}
                    </span>
                  </div>
                </div>

                <ThreatBadge level={getThreatLevel(threat.combined_score || 0)} />

                <div className="text-xs text-muted-foreground">
                  {threat.alert_count || 0} alerts
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </CyberCard>
  );
};

export default TopThreatsPanel;
