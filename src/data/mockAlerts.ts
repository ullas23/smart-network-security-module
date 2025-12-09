import { ThreatLevel } from "@/components/ui/ThreatBadge";

export interface Alert {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  destination: string;
  threatLevel: ThreatLevel;
  description: string;
  protocol: string;
  port: number;
  classification: string;
  signature?: string;
}

export interface NetworkFlow {
  id: string;
  sourceIP: string;
  destIP: string;
  protocol: string;
  bytes: number;
  packets: number;
  duration: number;
  startTime: Date;
  threatScore: number;
}

export interface ThreatMetrics {
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  blockedIPs: number;
  activeConnections: number;
  bytesAnalyzed: number;
  packetsProcessed: number;
  avgThreatScore: number;
}

const threatTypes = [
  "SQL Injection Attempt",
  "Port Scan Detected",
  "Brute Force Attack",
  "Malware Communication",
  "DNS Tunneling",
  "Command & Control Beacon",
  "Data Exfiltration Attempt",
  "SSH Brute Force",
  "DDoS Attack Pattern",
  "Suspicious TLS Handshake",
  "Buffer Overflow Attempt",
  "XSS Attack Detected",
  "Cryptominer Activity",
  "Ransomware Behavior",
  "Lateral Movement Detected",
];

const classifications = [
  "Reconnaissance",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Exfiltration",
  "Command and Control",
];

const protocols = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS", "SSH", "FTP", "SMTP"];

const generateIP = () => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255
  )}.${Math.floor(Math.random() * 255)}`;
};

const generateThreatLevel = (): ThreatLevel => {
  const levels: ThreatLevel[] = ["critical", "high", "medium", "low", "info"];
  const weights = [0.05, 0.15, 0.3, 0.35, 0.15];
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < levels.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return levels[i];
  }
  return "info";
};

export const generateAlert = (): Alert => {
  const threatLevel = generateThreatLevel();
  return {
    id: `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
    source: generateIP(),
    destination: generateIP(),
    threatLevel,
    description: `Detected suspicious activity matching threat signature`,
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    port: Math.floor(Math.random() * 65535),
    classification: classifications[Math.floor(Math.random() * classifications.length)],
    signature: `SID:${Math.floor(Math.random() * 9999999)}`,
  };
};

export const generateFlow = (): NetworkFlow => {
  return {
    id: `FLW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceIP: generateIP(),
    destIP: generateIP(),
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    bytes: Math.floor(Math.random() * 10000000),
    packets: Math.floor(Math.random() * 10000),
    duration: Math.floor(Math.random() * 3600),
    startTime: new Date(Date.now() - Math.random() * 3600000),
    threatScore: Math.random() * 100,
  };
};

export const generateMetrics = (): ThreatMetrics => {
  return {
    totalAlerts: Math.floor(Math.random() * 10000) + 1000,
    criticalCount: Math.floor(Math.random() * 50),
    highCount: Math.floor(Math.random() * 200),
    mediumCount: Math.floor(Math.random() * 500),
    lowCount: Math.floor(Math.random() * 1000),
    blockedIPs: Math.floor(Math.random() * 500),
    activeConnections: Math.floor(Math.random() * 5000) + 100,
    bytesAnalyzed: Math.floor(Math.random() * 1000000000000),
    packetsProcessed: Math.floor(Math.random() * 100000000),
    avgThreatScore: Math.random() * 100,
  };
};

export const initialAlerts: Alert[] = Array.from({ length: 50 }, generateAlert);
export const initialFlows: NetworkFlow[] = Array.from({ length: 100 }, generateFlow);
