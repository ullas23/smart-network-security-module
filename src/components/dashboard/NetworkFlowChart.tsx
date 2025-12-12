import { useMemo } from "react";
import CyberCard from "@/components/ui/CyberCard";
import { Network, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFlows, useAlerts } from "@/hooks/useSNSMData";
import { format } from "date-fns";

const NetworkFlowChart = () => {
  const { data: flows, isLoading } = useFlows(100);
  const { data: alerts } = useAlerts(100);

  // Transform data for chart using real flows
  const chartData = useMemo(() => {
    if (!flows || flows.length === 0) {
      // Generate placeholder data if no real data
      return Array.from({ length: 30 }, (_, i) => ({
        time: `${i}s`,
        inbound: 0,
        outbound: 0,
        threats: 0,
      }));
    }

    // Oldest first for smoother chart
    const ordered = [...flows].sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });

    return ordered.map((flow, index) => ({
      time: flow.timestamp
        ? format(new Date(flow.timestamp), "HH:mm:ss")
        : `${index}s`,
      inbound: (flow.bytes_recv || 0) / 1024, // KB received
      outbound: (flow.bytes_sent || 0) / 1024, // KB sent
      threats: flow.threat_score || 0,
    }));
  }, [flows]);

  // Count recent threats from alerts
  const recentThreats = useMemo(() => {
    if (!alerts) return 0;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return alerts.filter((a) => 
      a.timestamp && new Date(a.timestamp) > fiveMinutesAgo
    ).length;
  }, [alerts]);

  if (isLoading) {
    return (
      <CyberCard
        title="Network Traffic Flow"
        icon={<Network className="w-4 h-4" />}
        className="h-full"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading traffic data...</span>
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard
      title="Network Traffic Flow"
      icon={<Network className="w-4 h-4" />}
      className="h-full"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="inboundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(120, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outboundGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="hsl(120, 60%, 30%)"
              tick={{ fill: "hsl(120, 60%, 45%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(120, 100%, 15%)" }}
            />
            <YAxis
              stroke="hsl(120, 60%, 30%)"
              tick={{ fill: "hsl(120, 60%, 45%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(120, 100%, 15%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 5%)",
                border: "1px solid hsl(120, 100%, 25%)",
                borderRadius: "4px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(120, 100%, 50%)" }}
            />
            <Area
              type="monotone"
              dataKey="inbound"
              stroke="hsl(120, 100%, 50%)"
              strokeWidth={2}
              fill="url(#inboundGradient)"
              dot={false}
              name="Inbound (KB/s)"
            />
            <Area
              type="monotone"
              dataKey="outbound"
              stroke="hsl(180, 100%, 50%)"
              strokeWidth={2}
              fill="url(#outboundGradient)"
              dot={false}
              name="Outbound"
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="hsl(0, 100%, 50%)"
              strokeWidth={1}
              fill="url(#threatGradient)"
              dot={false}
              name="Threats"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Inbound</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-accent" />
            <span className="text-muted-foreground">Outbound</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-destructive" />
            <span className="text-muted-foreground">Threats</span>
          </div>
        </div>
        <div className="text-muted-foreground">
          <span className="text-destructive font-mono">{recentThreats}</span> threats in last 5 min
        </div>
      </div>
    </CyberCard>
  );
};

export default NetworkFlowChart;
