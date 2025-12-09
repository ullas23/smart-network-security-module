import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "threat" | "info" | "success";
  glow?: boolean;
  title?: string;
  icon?: ReactNode;
}

const CyberCard = ({
  children,
  className,
  variant = "default",
  glow = false,
  title,
  icon,
}: CyberCardProps) => {
  const variants = {
    default: "border-primary/30 bg-card/80",
    threat: "border-destructive/50 bg-destructive/5",
    info: "border-info/50 bg-info/5",
    success: "border-success/50 bg-success/5",
  };

  return (
    <div
      className={cn(
        "relative border backdrop-blur-sm rounded overflow-hidden",
        variants[variant],
        glow && "pulse-glow",
        className
      )}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

      {title && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/5">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="text-xs uppercase tracking-widest text-primary font-medium">
            {title}
          </span>
        </div>
      )}

      <div className="p-4">{children}</div>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-20 animate-scan opacity-50" />
      </div>
    </div>
  );
};

export default CyberCard;
