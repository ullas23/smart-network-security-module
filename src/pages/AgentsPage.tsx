import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { Server, Cpu, HardDrive, Wifi, Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAgents } from "@/hooks/useSNSMData";

const AgentsPage = () => {
  const { data: agents, isLoading, refetch } = useAgents();

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'offline': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'online': return 'border-success/30 bg-success/5';
      case 'offline': return 'border-destructive/30 bg-destructive/5';
      case 'degraded': return 'border-warning/30 bg-warning/5';
      default: return 'border-muted/30 bg-muted/5';
    }
  };

  const onlineCount = agents?.filter(a => a.status === 'online').length || 0;
  const offlineCount = agents?.filter(a => a.status === 'offline').length || 0;
  const degradedCount = agents?.filter(a => a.status === 'degraded').length || 0;

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
              className="mb-6 flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-primary text-glow mb-2">Agent Management</h1>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage SNSM agents deployed across your network
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="border-primary/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded border border-success/30 bg-success/5"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Online</div>
                    <div className="text-2xl font-bold text-success">{onlineCount}</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded border border-warning/30 bg-warning/5"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Degraded</div>
                    <div className="text-2xl font-bold text-warning">{degradedCount}</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded border border-destructive/30 bg-destructive/5"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Offline</div>
                    <div className="text-2xl font-bold text-destructive">{offlineCount}</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Loading agents...
                </div>
              ) : agents?.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium">No agents registered</div>
                  <div className="text-sm text-muted-foreground">Start monitoring to register an agent</div>
                </div>
              ) : (
                agents?.map((agent, idx) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <CyberCard
                      title={agent.hostname || 'Unknown Agent'}
                      icon={<Server className="w-4 h-4" />}
                      className={`h-full ${getStatusColor(agent.status)}`}
                    >
                      <div className="space-y-4">
                        {/* Status and IP */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(agent.status)}
                            <Badge variant="outline" className={`
                              ${agent.status === 'online' ? 'border-success/50 text-success' : ''}
                              ${agent.status === 'offline' ? 'border-destructive/50 text-destructive' : ''}
                              ${agent.status === 'degraded' ? 'border-warning/50 text-warning' : ''}
                            `}>
                              {agent.status || 'unknown'}
                            </Badge>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {agent.ip_address || '-'}
                          </span>
                        </div>

                        {/* Agent ID */}
                        <div className="text-xs text-muted-foreground">
                          <span className="text-muted-foreground/50">ID:</span>{' '}
                          <span className="font-mono">{agent.agent_id?.slice(0, 8)}...</span>
                        </div>

                        {/* System Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground mb-1">OS</div>
                            <div className="font-medium truncate">{agent.os || 'Unknown'}</div>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground mb-1">Version</div>
                            <div className="font-medium">{agent.version || '-'}</div>
                          </div>
                        </div>

                        {/* Resource Usage */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground flex-1">CPU</span>
                            <span className="text-xs font-mono">{agent.cpu_percent?.toFixed(1) || 0}%</span>
                          </div>
                          <Progress value={agent.cpu_percent || 0} className="h-1" />
                          
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground flex-1">Memory</span>
                            <span className="text-xs font-mono">{agent.memory_percent?.toFixed(1) || 0}%</span>
                          </div>
                          <Progress value={agent.memory_percent || 0} className="h-1" />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground mb-1">Packets</div>
                            <div className="font-medium">{agent.packets_captured?.toLocaleString() || 0}</div>
                          </div>
                          <div className="p-2 rounded bg-background/50">
                            <div className="text-muted-foreground mb-1">Alerts</div>
                            <div className="font-medium">{agent.alerts_generated || 0}</div>
                          </div>
                        </div>

                        {/* Last Seen */}
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-primary/10">
                          Last seen: {agent.last_seen ? formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true }) : 'Never'}
                        </div>
                      </div>
                    </CyberCard>
                  </motion.div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;