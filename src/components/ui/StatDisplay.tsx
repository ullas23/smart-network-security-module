import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatDisplayProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  variant?: "default" | "threat" | "success";
}

const StatDisplay = ({
  label,
  value,
  subValue,
  trend,
  className,
  variant = "default",
}: StatDisplayProps) => {
  const variants = {
    default: "text-primary",
    threat: "text-destructive text-glow-red",
    success: "text-success",
  };

  return (
    <div className={cn("relative", className)}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <motion.div
        className={cn("text-3xl font-bold font-terminal", variants[variant])}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={value.toString()}
      >
        {value}
        {trend && (
          <span
            className={cn(
              "ml-2 text-sm",
              trend === "up" && "text-destructive",
              trend === "down" && "text-success",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" && "▲"}
            {trend === "down" && "▼"}
            {trend === "neutral" && "—"}
          </span>
        )}
      </motion.div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  );
};

export default StatDisplay;
