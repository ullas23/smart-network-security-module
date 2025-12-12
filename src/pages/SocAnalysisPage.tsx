import MatrixRain from "@/components/effects/MatrixRain";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import CommandTerminal from "@/components/dashboard/CommandTerminal";
import SystemStatus from "@/components/dashboard/SystemStatus";
import TerminalText from "@/components/ui/TerminalText";

const SocAnalysisPage = () => {
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
                text="SOC ANALYSIS WORKBENCH"
                className="text-lg mb-2"
                typeSpeed={30}
              />
              <p className="text-sm text-muted-foreground">
                Triage recent alerts, inspect system status, and review correlated log output.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              <AlertsFeed />
              <SystemStatus />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <CommandTerminal />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SocAnalysisPage;
