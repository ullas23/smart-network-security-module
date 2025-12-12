import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CommandTerminal from "@/components/dashboard/CommandTerminal";

const TerminalPage = () => {
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-bold text-primary text-glow mb-2">Command Terminal</h1>
              <p className="text-sm text-muted-foreground">
                Execute SNSM commands and view system diagnostics
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="h-[calc(100vh-220px)]"
            >
              <CommandTerminal />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TerminalPage;