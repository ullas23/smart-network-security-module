import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Activity, WifiOff } from "lucide-react";
import { useGlobalThreatLevel, useAgents, useBlocklist, useThreatScores } from "@/hooks/useSNSMData";

const ThreatScoreGauge = () => {
  const { score, status, label } = useGlobalThreatLevel();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: blocklist } = useBlocklist();
  const { data: threatScores } = useThreatScores(10);

  const onlineAgents = agents?.filter((a) => a.status === "online").length || 0;
  const degradedAgents = agents?.filter((a) => a.status === "degraded").length || 0;
  const blockedIPs = blocklist?.length || 0;
  
  // Check if we have any real threat data
  const hasRealData = (threatScores && threatScores.length > 0) || onlineAgents > 0;

  const getColor = () => {
    switch (status) {
      case "safe":
        return "hsl(var(--success))";
      case "warning":
        return "hsl(var(--warning))";
      case "danger":
        return "hsl(var(--destructive))";
    }
  };

  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // No data state
  if (!agentsLoading && !hasRealData && score === 0) {
    return (
      <CyberCard
        title="Global Threat Level"
        icon={<Activity className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <WifiOff className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-sm font-medium">Awaiting Agent Data</p>
          <p className="text-xs mt-1 text-center max-w-xs">
            No threat intelligence available. Deploy an agent to start monitoring.
          </p>
          
          {/* Grayed out gauge preview */}
          <div className="mt-6 relative w-32 h-32 opacity-30">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold font-terminal">--</div>
              <div className="text-xs uppercase tracking-widest mt-1">No Data</div>
            </div>
          </div>
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard
      title="Global Threat Level"
      icon={<Activity className="w-4 h-4" />}
      className="h-full"
    >
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={getColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 10px ${getColor()})`,
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-5xl font-bold font-terminal"
              style={{ color: getColor() }}
              animate={{ textShadow: `0 0 20px ${getColor()}` }}
            >
              {Math.round(score)}
            </motion.div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              Threat Score
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColor() }}
            animate={{
              boxShadow: [
                `0 0 5px ${getColor()}`,
                `0 0 20px ${getColor()}`,
                `0 0 5px ${getColor()}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span
            className="text-sm uppercase tracking-wider font-medium"
            style={{ color: getColor() }}
          >
            {label}
          </span>
        </div>

        {/* Additional metrics */}
        <div className="mt-6 grid grid-cols-3 gap-4 w-full text-center">
          <div>
            <div className="text-2xl font-terminal text-success">{onlineAgents}</div>
            <div className="text-xs text-muted-foreground">Agents Online</div>
          </div>
          <div>
            <div className="text-2xl font-terminal text-warning">{degradedAgents}</div>
            <div className="text-xs text-muted-foreground">Degraded</div>
          </div>
          <div>
            <div className="text-2xl font-terminal text-info">{blockedIPs}</div>
            <div className="text-xs text-muted-foreground">IPs Blocked</div>
          </div>
        </div>
      </div>
    </CyberCard>
  );
};

export default ThreatScoreGauge;
