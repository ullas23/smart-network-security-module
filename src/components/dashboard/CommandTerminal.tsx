import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Terminal } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "warning" | "error" | "success" | "command";
  message: string;
}

const initialLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: new Date(),
    type: "info",
    message: "SENTINEL v1.0.0 initialized",
  },
  {
    id: "2",
    timestamp: new Date(),
    type: "success",
    message: "All security modules loaded successfully",
  },
  {
    id: "3",
    timestamp: new Date(),
    type: "info",
    message: "Packet capture engine started on eth0",
  },
  {
    id: "4",
    timestamp: new Date(),
    type: "info",
    message: "Zeek flow analyzer connected",
  },
  {
    id: "5",
    timestamp: new Date(),
    type: "success",
    message: "Suricata IDS engine online - 847 rules loaded",
  },
];

const randomLogs = [
  { type: "info" as const, message: "Connection established from agent-node-03" },
  { type: "warning" as const, message: "High CPU usage detected on anomaly engine" },
  { type: "info" as const, message: "Blocklist updated: 23 new IPs added" },
  { type: "error" as const, message: "Failed to resolve DNS for suspicious domain" },
  { type: "success" as const, message: "Threat neutralized: blocked IP 45.33.32.156" },
  { type: "info" as const, message: "New Zeek log batch processed: 1,234 flows" },
  { type: "warning" as const, message: "Rate limit exceeded for source 192.168.1.105" },
  { type: "success" as const, message: "Rule update deployed to all agents" },
  { type: "info" as const, message: "Correlation engine processed 500 events" },
  { type: "error" as const, message: "Agent timeout: reconnecting to node-07" },
];

const CommandTerminal = () => {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [command, setCommand] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomLog = randomLogs[Math.floor(Math.random() * randomLogs.length)];
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type: randomLog.type,
        message: randomLog.message,
      };
      setLogs((prev) => [...prev.slice(-50), newLog]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && command.trim()) {
      const cmdLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type: "command",
        message: `$ ${command}`,
      };
      setLogs((prev) => [...prev, cmdLog]);
      setCommand("");

      // Simulate command response
      setTimeout(() => {
        const response: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type: "info",
          message: `Executing: ${command}...`,
        };
        setLogs((prev) => [...prev, response]);
      }, 500);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info":
        return "text-primary";
      case "warning":
        return "text-warning";
      case "error":
        return "text-destructive";
      case "success":
        return "text-success";
      case "command":
        return "text-accent";
      default:
        return "text-foreground";
    }
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().slice(0, 8);
  };

  return (
    <CyberCard
      title="System Console"
      icon={<Terminal className="w-4 h-4" />}
      className="h-full"
    >
      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto font-mono text-xs space-y-1 mb-3"
      >
        {logs.map((log) => (
          <motion.div
            key={log.id}
            className="flex gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-muted-foreground shrink-0">
              [{formatTime(log.timestamp)}]
            </span>
            <span className={getTypeColor(log.type)}>{log.message}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-primary/10 pt-3">
        <span className="text-primary">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 font-mono"
        />
        <motion.div
          className="w-2 h-4 bg-primary"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
    </CyberCard>
  );
};

export default CommandTerminal;
