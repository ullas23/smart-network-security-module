import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Filter, Search, RefreshCw, Download, Eye, Shield, Clock, MapPin } from "lucide-react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MatrixRain from "@/components/effects/MatrixRain";
import CyberCard from "@/components/ui/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/hooks/useSNSMData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AlertsPage = () => {
  const { data: alerts, isLoading, refetch } = useAlerts(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const filteredAlerts = alerts?.filter(alert => {
    const matchesSearch = 
      alert.src_ip?.includes(searchTerm) ||
      alert.dst_ip?.includes(searchTerm) ||
      alert.signature_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  }) || [];

  const severityCounts = {
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    high: alerts?.filter(a => a.severity === 'high').length || 0,
    medium: alerts?.filter(a => a.severity === 'medium').length || 0,
    low: alerts?.filter(a => a.severity === 'low').length || 0,
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
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
              <h1 className="text-2xl font-bold text-primary text-glow mb-2">Security Alerts</h1>
              <p className="text-sm text-muted-foreground">
                Real-time threat detection from Suricata IDS and anomaly detection engines
              </p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(severityCounts).map(([severity, count]) => (
                <motion.div
                  key={severity}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded border ${
                    severity === 'critical' ? 'border-destructive/30 bg-destructive/5' :
                    severity === 'high' ? 'border-warning/30 bg-warning/5' :
                    severity === 'medium' ? 'border-info/30 bg-info/5' :
                    'border-success/30 bg-success/5'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {severity}
                  </div>
                  <div className={`text-2xl font-bold ${
                    severity === 'critical' ? 'text-destructive' :
                    severity === 'high' ? 'text-warning' :
                    severity === 'medium' ? 'text-info' :
                    'text-success'
                  }`}>
                    {count}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <CyberCard title="Filters" icon={<Filter className="w-4 h-4" />} className="mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by IP, signature, category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background border-primary/20"
                    />
                  </div>
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px] bg-background border-primary/20">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
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

            {/* Alerts Table */}
            <CyberCard title={`Alerts (${filteredAlerts.length})`} icon={<AlertTriangle className="w-4 h-4" />}>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
                  <div className="text-lg font-medium text-success">No alerts found</div>
                  <div className="text-sm text-muted-foreground">All systems operating normally</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary/10 text-left">
                        <th className="pb-3 text-muted-foreground font-medium">Time</th>
                        <th className="pb-3 text-muted-foreground font-medium">Severity</th>
                        <th className="pb-3 text-muted-foreground font-medium">Signature</th>
                        <th className="pb-3 text-muted-foreground font-medium">Source</th>
                        <th className="pb-3 text-muted-foreground font-medium">Destination</th>
                        <th className="pb-3 text-muted-foreground font-medium">Score</th>
                        <th className="pb-3 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlerts.map((alert) => (
                        <motion.tr
                          key={alert.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`border-b border-primary/5 hover:bg-primary/5 transition-colors ${
                            selectedAlert === alert.id ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => setSelectedAlert(alert.id === selectedAlert ? null : alert.id)}
                        >
                          <td className="py-3 font-mono text-xs text-muted-foreground">
                            {alert.timestamp ? format(new Date(alert.timestamp), 'HH:mm:ss') : '-'}
                          </td>
                          <td className="py-3">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity || 'unknown'}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="font-medium text-foreground">{alert.signature_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{alert.category || '-'}</div>
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {alert.src_ip}:{alert.src_port || '-'}
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {alert.dst_ip}:{alert.dst_port || '-'}
                          </td>
                          <td className="py-3">
                            <span className={`font-bold ${
                              (alert.threat_score || 0) >= 70 ? 'text-destructive' :
                              (alert.threat_score || 0) >= 40 ? 'text-warning' :
                              'text-success'
                            }`}>
                              {alert.threat_score?.toFixed(0) || 0}
                            </span>
                          </td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CyberCard>

            {/* Data Verification Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 rounded border border-info/20 bg-info/5"
            >
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <div className="font-medium text-info mb-1">Data Authenticity Verification</div>
                  <div className="text-sm text-muted-foreground">
                    All alerts are timestamped and stored in the database with unique IDs. 
                    Verify authenticity by checking:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Alert ID matches database record</li>
                      <li>Timestamps are consistent with agent heartbeats</li>
                      <li>Source IPs correlate with network flow data</li>
                      <li>Check the Logs page for raw edge function logs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;