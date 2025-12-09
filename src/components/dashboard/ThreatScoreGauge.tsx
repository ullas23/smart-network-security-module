import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Activity } from "lucide-react";

const ThreatScoreGauge = () => {
  const [score, setScore] = useState(45);
  const [status, setStatus] = useState<"safe" | "warning" | "danger">("warning");

  useEffect(() => {
    const interval = setInterval(() => {
      const newScore = Math.max(0, Math.min(100, score + (Math.random() * 10 - 5)));
      setScore(newScore);

      if (newScore < 30) setStatus("safe");
      else if (newScore < 70) setStatus("warning");
      else setStatus("danger");
    }, 3000);

    return () => clearInterval(interval);
  }, [score]);

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
            {status === "safe" && "Systems Secure"}
            {status === "warning" && "Elevated Risk"}
            {status === "danger" && "Critical Alert"}
          </span>
        </div>

        {/* Additional metrics */}
        <div className="mt-6 grid grid-cols-3 gap-4 w-full text-center">
          <div>
            <div className="text-2xl font-terminal text-success">12</div>
            <div className="text-xs text-muted-foreground">Agents Online</div>
          </div>
          <div>
            <div className="text-2xl font-terminal text-warning">3</div>
            <div className="text-xs text-muted-foreground">Under Attack</div>
          </div>
          <div>
            <div className="text-2xl font-terminal text-info">847</div>
            <div className="text-xs text-muted-foreground">Rules Active</div>
          </div>
        </div>
      </div>
    </CyberCard>
  );
};

export default ThreatScoreGauge;
