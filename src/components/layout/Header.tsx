import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Bell, Terminal, Settings, User, ChevronDown, LogOut, UserCog, Database, Key, Moon, Sun, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlerts } from "@/hooks/useSNSMData";

const Header = () => {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const { data: alerts } = useAlerts(50);
  
  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged) || [];
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
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
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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
            </Link>
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
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
                  <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  {unacknowledgedAlerts.length > 0 && (
                    <motion.span
                      className={`absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center rounded-full ${
                        criticalAlerts.length > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      key={unacknowledgedAlerts.length}
                    >
                      {unacknowledgedAlerts.length > 99 ? "99+" : unacknowledgedAlerts.length}
                    </motion.span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-background border-primary/20">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-xs text-muted-foreground">{unacknowledgedAlerts.length} unread</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {unacknowledgedAlerts.slice(0, 5).map((alert) => (
                    <DropdownMenuItem key={alert.id} className="flex items-start gap-3 py-3 cursor-pointer" onClick={() => navigate('/alerts')}>
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      ) : alert.severity === 'high' ? (
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-info mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{alert.signature_name || 'Unknown Alert'}</div>
                        <div className="text-xs text-muted-foreground">{alert.src_ip} → {alert.dst_ip}</div>
                        <div className="text-xs text-muted-foreground">
                          {alert.timestamp ? format(new Date(alert.timestamp), 'HH:mm:ss') : 'Unknown time'}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {unacknowledgedAlerts.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                      No new notifications
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/alerts')} className="justify-center text-primary">
                  View all alerts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Terminal Button - links to terminal page */}
            <button 
              onClick={() => navigate('/terminal')}
              className="p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group"
            >
              <Terminal className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
                  <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border-primary/20">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  General Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/agents')}>
                  <Database className="w-4 h-4 mr-2" />
                  Agent Configuration
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Key className="w-4 h-4 mr-2" />
                  API Keys
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark Mode
                  <span className="ml-auto text-xs text-muted-foreground">On</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-primary/20 mx-2" />

            {/* Admin Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary/20 hover:bg-primary/10 transition-colors group">
                  <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    Admin
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border-primary/20">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Administrator</div>
                      <div className="text-xs text-muted-foreground">admin@snsm.local</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <UserCog className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/agents')}>
                  <Database className="w-4 h-4 mr-2" />
                  Manage Agents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/logs')}>
                  <Terminal className="w-4 h-4 mr-2" />
                  System Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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