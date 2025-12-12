import MatrixRain from "@/components/effects/MatrixRain";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import TopThreatsPanel from "@/components/dashboard/TopThreatsPanel";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import TerminalText from "@/components/ui/TerminalText";

const ThreatMapPage = () => {
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
                text="GLOBAL THREAT INTELLIGENCE MAP"
                className="text-lg mb-2"
                typeSpeed={30}
              />
              <p className="text-sm text-muted-foreground">
                Correlate top malicious IPs and alerts by source to understand where attacks originate.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 min-h-[320px] rounded border border-primary/20 bg-background/40 flex items-center justify-center text-sm text-muted-foreground">
                Geo-visual threat map placeholder — hook your geo IP pipeline here.
              </div>
              <div className="space-y-6">
                <TopThreatsPanel />
                <AlertsFeed />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ThreatMapPage;
