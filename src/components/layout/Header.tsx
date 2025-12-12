import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Bell, Terminal, Settings, User } from "lucide-react";
import { format } from "date-fns";

const Header = () => {
  const [time, setTime] = useState(new Date());
  const [alertCount, setAlertCount] = useState(42);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    const alertTimer = setInterval(() => {
      if (Math.random() > 0.7) {
        setAlertCount((prev) => prev + 1);
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(alertTimer);
    };
  }, []);

  return (
    <header className="border-b border-primary/20 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative">
              <Shield className="w-8 h-8 text-primary" />
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary text-glow tracking-wider">
                SNSM
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Smart Network Security Module
              </p>
            </div>
          </motion.div>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2 ml-8 px-3 py-1.5 rounded border border-success/30 bg-success/5">
            <motion.div
              className="w-2 h-2 rounded-full bg-success"
              animate={{
                boxShadow: [
                  "0 0 5px hsl(var(--success))",
                  "0 0 15px hsl(var(--success))",
                  "0 0 5px hsl(var(--success))",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs text-success uppercase tracking-wider">
              Systems Operational
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Time Display */}
          <div className="hidden lg:block text-right">
            <div className="text-lg font-mono text-primary text-glow">
              {format(time, "HH:mm:ss")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(time, "yyyy-MM-dd")} UTC
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              {alertCount > 0 && (
                <motion.span
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs flex items-center justify-center rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={alertCount}
                >
                  {alertCount > 99 ? "99+" : alertCount}
                </motion.span>
              )}
            </button>

            <button className="p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
              <Terminal className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button className="p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
              <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <div className="w-px h-6 bg-primary/20 mx-2" />

            <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
              <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                Admin
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Animated scan line */}
      <motion.div
        className="h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </header>
  );
};

export default Header;
