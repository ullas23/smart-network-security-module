import { useState } from "react";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Shield,
  Network,
  FileSearch,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Globe,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Activity, label: "Live Monitor", to: "/monitor" },
  { icon: AlertTriangle, label: "Alerts", to: "/alerts" },
  { icon: Shield, label: "IDS/IPS", to: "/ids" },
  { icon: Network, label: "Network Flows", to: "/flows" },
  { icon: Globe, label: "Threat Map", to: "/map" },
  { icon: FileSearch, label: "SOC Analysis", to: "/soc" },
  { icon: Terminal, label: "Terminal", to: "/terminal" },
  { icon: Boxes, label: "Agents", to: "/agents" },
  { icon: Database, label: "Logs", to: "/logs" },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className="h-screen border-r border-primary/20 bg-sidebar flex flex-col sticky top-0"
      initial={{ width: 240 }}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full border border-primary/30 bg-background flex items-center justify-center hover:bg-primary/10 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-primary" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-primary" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200",
                  "text-muted-foreground hover:text-primary hover:bg-primary/5",
                  "border border-transparent hover:border-primary/20"
                )}
                activeClassName="text-primary bg-primary/10 border-primary/30 text-glow"
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <motion.span
                    className="text-sm whitespace-nowrap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-primary/10">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200",
            "text-muted-foreground hover:text-primary hover:bg-primary/5"
          )}
          activeClassName="text-primary bg-primary/10"
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </NavLink>

        {!collapsed && (
          <div className="mt-4 p-3 rounded border border-primary/10 bg-primary/5">
            <div className="text-xs text-muted-foreground">Version</div>
            <div className="text-sm text-primary font-mono">v1.0.0-alpha</div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
