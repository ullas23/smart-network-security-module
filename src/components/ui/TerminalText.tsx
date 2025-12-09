import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface TerminalTextProps {
  text: string;
  className?: string;
  typeSpeed?: number;
  showCursor?: boolean;
  prefix?: string;
}

const TerminalText = ({
  text,
  className,
  typeSpeed = 50,
  showCursor = true,
  prefix = "> ",
}: TerminalTextProps) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayText("");
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, typeSpeed);

    return () => clearInterval(timer);
  }, [text, typeSpeed]);

  return (
    <div className={cn("font-mono text-primary", className)}>
      <span className="text-muted-foreground">{prefix}</span>
      <span>{displayText}</span>
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle"
        />
      )}
    </div>
  );
};

export default TerminalText;
