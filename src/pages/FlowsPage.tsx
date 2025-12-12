import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Network, Filter, Search, RefreshCw, Download, ArrowRight, Activity } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFlows } from "@/hooks/useSNSMData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FlowsPage = () => {
  const { data: flows, isLoading, refetch } = useFlows(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");

  const filteredFlows = flows?.filter(flow => {
    const matchesSearch = 
      flow.src_ip?.includes(searchTerm) ||
      flow.dst_ip?.includes(searchTerm) ||
      flow.service?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProtocol = protocolFilter === "all" || flow.protocol === protocolFilter;
    
    return matchesSearch && matchesProtocol;
  }) || [];

  const protocolCounts = {
    tcp: flows?.filter(f => f.protocol === 'tcp').length || 0,
    udp: flows?.filter(f => f.protocol === 'udp').length || 0,
    icmp: flows?.filter(f => f.protocol === 'icmp').length || 0,
  };

  const totalBytes = flows?.reduce((sum, f) => sum + (f.bytes_sent || 0) + (f.bytes_recv || 0), 0) || 0;
  const totalPackets = flows?.reduce((sum, f) => sum + (f.packets_sent || 0) + (f.packets_recv || 0), 0) || 0;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

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
              <h1 className="text-2xl font-bold text-primary text-glow mb-2">Network Flows</h1>
              <p className="text-sm text-muted-foreground">
                Connection tracking and flow analysis from Zeek network security monitor
              </p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded border border-primary/20 bg-primary/5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Flows</div>
                <div className="text-2xl font-bold text-primary">{flows?.length || 0}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded border border-info/20 bg-info/5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Data</div>
                <div className="text-2xl font-bold text-info">{formatBytes(totalBytes)}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded border border-success/20 bg-success/5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">TCP</div>
                <div className="text-2xl font-bold text-success">{protocolCounts.tcp}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded border border-warning/20 bg-warning/5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">UDP</div>
                <div className="text-2xl font-bold text-warning">{protocolCounts.udp}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="p-4 rounded border border-muted/20 bg-muted/5"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">ICMP</div>
                <div className="text-2xl font-bold text-muted-foreground">{protocolCounts.icmp}</div>
              </motion.div>
            </div>

            {/* Filters */}
            <CyberCard title="Filters" icon={<Filter className="w-4 h-4" />} className="mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by IP, service..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background border-primary/20"
                    />
                  </div>
                </div>
                <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                  <SelectTrigger className="w-[150px] bg-background border-primary/20">
                    <SelectValue placeholder="Protocol" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="all">All Protocols</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => refetch()} className="border-primary/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" className="border-primary/20">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CyberCard>

            {/* Flows Table */}
            <CyberCard title={`Flows (${filteredFlows.length})`} icon={<Network className="w-4 h-4" />}>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading flows...</div>
              ) : filteredFlows.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium">No flows found</div>
                  <div className="text-sm text-muted-foreground">Start monitoring to capture network flows</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary/10 text-left">
                        <th className="pb-3 text-muted-foreground font-medium">Time</th>
                        <th className="pb-3 text-muted-foreground font-medium">Protocol</th>
                        <th className="pb-3 text-muted-foreground font-medium">Source</th>
                        <th className="pb-3 text-muted-foreground font-medium"></th>
                        <th className="pb-3 text-muted-foreground font-medium">Destination</th>
                        <th className="pb-3 text-muted-foreground font-medium">Service</th>
                        <th className="pb-3 text-muted-foreground font-medium">Bytes</th>
                        <th className="pb-3 text-muted-foreground font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFlows.slice(0, 50).map((flow) => (
                        <motion.tr
                          key={flow.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-primary/5 hover:bg-primary/5 transition-colors"
                        >
                          <td className="py-3 font-mono text-xs text-muted-foreground">
                            {flow.timestamp ? format(new Date(flow.timestamp), 'HH:mm:ss') : '-'}
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className={`
                              ${flow.protocol === 'tcp' ? 'border-success/50 text-success' : ''}
                              ${flow.protocol === 'udp' ? 'border-warning/50 text-warning' : ''}
                              ${flow.protocol === 'icmp' ? 'border-muted/50 text-muted-foreground' : ''}
                            `}>
                              {flow.protocol?.toUpperCase() || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {flow.src_ip}:{flow.src_port || '-'}
                          </td>
                          <td className="py-3">
                            <ArrowRight className="w-4 h-4 text-primary" />
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {flow.dst_ip}:{flow.dst_port || '-'}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {flow.service || '-'}
                          </td>
                          <td className="py-3 text-xs">
                            <span className="text-success">{formatBytes(flow.bytes_sent || 0)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-info">{formatBytes(flow.bytes_recv || 0)}</span>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {flow.duration?.toFixed(2)}s
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CyberCard>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FlowsPage;