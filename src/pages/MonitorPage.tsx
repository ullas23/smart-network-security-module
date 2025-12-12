import MatrixRain from "@/components/effects/MatrixRain";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ThreatScoreGauge from "@/components/dashboard/ThreatScoreGauge";
import NetworkFlowChart from "@/components/dashboard/NetworkFlowChart";
import SystemStatus from "@/components/dashboard/SystemStatus";
import IPConfigPanel from "@/components/dashboard/IPConfigPanel";
import CommandTerminal from "@/components/dashboard/CommandTerminal";
import TerminalText from "@/components/ui/TerminalText";

const MonitorPage = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <MatrixRain />
      <div className="fixed inset-0 pointer-events-none scanlines z-10" />

      <div className="relative z-20 flex w-full">
        <Sidebar />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header />

          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <TerminalText
                text="LIVE NETWORK MONITOR - REAL-TIME PACKET FLOWS"
                className="text-lg mb-2"
                typeSpeed={30}
              />
              <p className="text-sm text-muted-foreground">
                Focused view showing live flows, threat scores, and agent status for the selected IP.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
              <div>
                <IPConfigPanel />
              </div>
              <div>
                <ThreatScoreGauge />
              </div>
              <div className="xl:col-span-2">
                <NetworkFlowChart />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <SystemStatus />
              </div>
              <div>
                <CommandTerminal />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MonitorPage;
