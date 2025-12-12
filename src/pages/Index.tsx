import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import ThreatMetricsPanel from "@/components/dashboard/ThreatMetricsPanel";
import ThreatScoreGauge from "@/components/dashboard/ThreatScoreGauge";
import NetworkFlowChart from "@/components/dashboard/NetworkFlowChart";
import TopThreatsPanel from "@/components/dashboard/TopThreatsPanel";
import SystemStatus from "@/components/dashboard/SystemStatus";
import CommandTerminal from "@/components/dashboard/CommandTerminal";
import IPConfigPanel from "@/components/dashboard/IPConfigPanel";
import TerminalText from "@/components/ui/TerminalText";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <MatrixRain />
      <div className="fixed inset-0 pointer-events-none scanlines z-10" />

      <div className="relative z-20 flex w-full">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header />

          <main className="flex-1 p-6 overflow-auto">
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TerminalText
                text="SNSM - SMART NETWORK SECURITY MODULE INITIALIZED"
                className="text-lg mb-2"
                typeSpeed={30}
              />
              <p className="text-sm text-muted-foreground">
                Real-time network monitoring, intrusion detection, and automated threat response
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <ThreatMetricsPanel />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <IPConfigPanel />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                <ThreatScoreGauge />
              </motion.div>

              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <NetworkFlowChart />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <AlertsFeed />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <TopThreatsPanel />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <SystemStatus />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <CommandTerminal />
              </motion.div>
            </div>
          </main>

          <footer className="border-t border-primary/10 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>© 2024 SNSM Security Platform</span>
                <span className="text-primary/50">|</span>
                <span>Classification: CONFIDENTIAL</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-success">● Connected</span>
                <span>Hybrid Cloud Architecture</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Index;
