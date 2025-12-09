import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CyberCard from "@/components/ui/CyberCard";
import { Network } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  time: string;
  inbound: number;
  outbound: number;
  threats: number;
}

const generateDataPoint = (index: number): DataPoint => ({
  time: `${index}s`,
  inbound: Math.floor(Math.random() * 500) + 200,
  outbound: Math.floor(Math.random() * 400) + 150,
  threats: Math.floor(Math.random() * 50),
});

const NetworkFlowChart = () => {
  const [data, setData] = useState<DataPoint[]>(
    Array.from({ length: 30 }, (_, i) => generateDataPoint(i))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        newData.push(generateDataPoint(30));
        return newData.map((d, i) => ({ ...d, time: `${i}s` }));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CyberCard
      title="Network Traffic Flow"
      icon={<Network className="w-4 h-4" />}
      className="h-full"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
            />
            <Area
              type="monotone"
              dataKey="outbound"
              stroke="hsl(180, 100%, 50%)"
              strokeWidth={2}
              fill="url(#outboundGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="threats"
              stroke="hsl(0, 100%, 50%)"
              strokeWidth={1}
              fill="url(#threatGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
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
    </CyberCard>
  );
};

export default NetworkFlowChart;
