import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import ThreatBadge from "@/components/ui/ThreatBadge";
import { Crosshair, Globe, Server } from "lucide-react";

interface TopThreat {
  id: string;
  ip: string;
  country: string;
  attackType: string;
  count: number;
  threatScore: number;
  blocked: boolean;
}

const countries = ["CN", "RU", "KP", "IR", "US", "BR", "IN", "DE", "NL", "UA"];
const attackTypes = [
  "Brute Force",
  "DDoS",
  "SQL Injection",
  "Port Scan",
  "Malware C2",
  "Phishing",
  "Data Exfil",
];

const generateThreat = (): TopThreat => ({
  id: Math.random().toString(36).substr(2, 9),
  ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255
  )}.${Math.floor(Math.random() * 255)}`,
  country: countries[Math.floor(Math.random() * countries.length)],
  attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
  count: Math.floor(Math.random() * 1000) + 100,
  threatScore: Math.random() * 100,
  blocked: Math.random() > 0.3,
});

const TopThreatsPanel = () => {
  const [threats, setThreats] = useState<TopThreat[]>(
    Array.from({ length: 8 }, generateThreat).sort((a, b) => b.threatScore - a.threatScore)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setThreats((prev) => {
        const updated = [...prev];
        const index = Math.floor(Math.random() * updated.length);
        updated[index] = {
          ...updated[index],
          count: updated[index].count + Math.floor(Math.random() * 10),
          threatScore: Math.min(100, updated[index].threatScore + Math.random() * 5),
        };
        return updated.sort((a, b) => b.threatScore - a.threatScore);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getThreatLevel = (score: number) => {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    if (score >= 20) return "low";
    return "info";
  };

  return (
    <CyberCard
      title="Top Threat Sources"
      icon={<Crosshair className="w-4 h-4" />}
      className="h-full"
    >
      <div className="space-y-2">
        {threats.map((threat, index) => (
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
              <span className="text-xs text-muted-foreground">{threat.country}</span>
              <span className="font-mono text-sm text-foreground truncate">
                {threat.ip}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground hidden md:block">
                {threat.attackType}
              </span>

              <div className="w-20">
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          threat.threatScore >= 80
                            ? "hsl(var(--destructive))"
                            : threat.threatScore >= 50
                            ? "hsl(var(--warning))"
                            : "hsl(var(--primary))",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${threat.threatScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">
                    {threat.threatScore.toFixed(0)}
                  </span>
                </div>
              </div>

              <ThreatBadge level={getThreatLevel(threat.threatScore)} />

              {threat.blocked && (
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </CyberCard>
  );
};

export default TopThreatsPanel;
