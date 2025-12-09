import { cn } from "@/lib/utils";

export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

interface ThreatBadgeProps {
  level: ThreatLevel;
  className?: string;
  pulse?: boolean;
}

const ThreatBadge = ({ level, className, pulse = false }: ThreatBadgeProps) => {
  const variants: Record<ThreatLevel, { bg: string; text: string; label: string }> = {
    critical: {
      bg: "bg-threat-critical/20 border-threat-critical",
      text: "text-threat-critical",
      label: "CRITICAL",
    },
    high: {
      bg: "bg-threat-high/20 border-threat-high",
      text: "text-threat-high",
      label: "HIGH",
    },
    medium: {
      bg: "bg-threat-medium/20 border-threat-medium",
      text: "text-threat-medium",
      label: "MEDIUM",
    },
    low: {
      bg: "bg-threat-low/20 border-threat-low",
      text: "text-threat-low",
      label: "LOW",
    },
    info: {
      bg: "bg-threat-info/20 border-threat-info",
      text: "text-threat-info",
      label: "INFO",
    },
  };

  const variant = variants[level];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wider border rounded-sm",
        variant.bg,
        variant.text,
        pulse && "animate-pulse",
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {variant.label}
    </span>
  );
};

export default ThreatBadge;
