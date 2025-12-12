#!/usr/bin/env python3
"""
SNSM Agent - Cross-Platform Network Security Monitor
=====================================================

A Python-based agent for capturing real network traffic and sending
it to your SNSM dashboard for analysis and visualization.

Supports: Linux, macOS, Windows

Requirements:
    pip install scapy requests psutil

Usage:
    sudo python3 snsm-agent.py                    # Auto-detect interface
    sudo python3 snsm-agent.py -i eth0            # Specific interface
    sudo python3 snsm-agent.py --simple           # Simple mode (no root needed)
    
Author: SNSM Security Platform
Version: 1.0.0
"""

import argparse
import json
import logging
import os
import platform
import signal
import socket
import sys
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.request import Request, urlopen
from urllib.error import URLError

# ============================================================================
# CONFIGURATION
# ============================================================================

BACKEND_URL = "https://rdvlqdztvdblqlendjyi.supabase.co/functions/v1"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdmxxZHp0dmRibHFsZW5kanlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzQwNjYsImV4cCI6MjA4MTA1MDA2Nn0.8fKuGNiwwqcd9ewV7dJx5ODNch1w9P4b4gwJHwCpUBU"

FLOW_UPLOAD_INTERVAL = 5  # seconds
HEARTBEAT_INTERVAL = 30   # seconds
MAX_FLOWS_PER_BATCH = 100

# Threat detection thresholds
PORTSCAN_THRESHOLD = 20      # ports in window
PORTSCAN_WINDOW = 10         # seconds
DDOS_THRESHOLD = 100         # packets in window
DDOS_WINDOW = 5              # seconds

# Service port mapping
SERVICE_PORTS = {
    20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
    53: "dns", 80: "http", 110: "pop3", 143: "imap", 443: "https",
    445: "smb", 993: "imaps", 995: "pop3s", 3306: "mysql",
    3389: "rdp", 5432: "postgresql", 8080: "http-proxy", 8443: "https-alt"
}

SUSPICIOUS_PORTS = {22, 23, 3389, 445, 135, 139, 1433, 3306, 5432}
MALICIOUS_PORTS = {4444, 5555, 6666, 31337, 12345, 6667}

# ============================================================================
# LOGGING SETUP
# ============================================================================

class ColoredFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'
    }
    
    def format(self, record):
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        record.levelname = f"{color}{record.levelname}{reset}"
        return super().format(record)

def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    handler = logging.StreamHandler()
    handler.setFormatter(ColoredFormatter(
        '%(asctime)s │ %(levelname)s │ %(message)s',
        datefmt='%H:%M:%S'
    ))
    logging.basicConfig(level=level, handlers=[handler])
    return logging.getLogger('snsm')

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Flow:
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    bytes_sent: int = 0
    bytes_recv: int = 0
    packets_sent: int = 0
    packets_recv: int = 0
    start_time: float = field(default_factory=time.time)
    end_time: float = field(default_factory=time.time)
    service: Optional[str] = None
    threat_score: int = 0
    
    def to_dict(self) -> dict:
        return {
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "protocol": self.protocol,
            "bytes_sent": self.bytes_sent,
            "bytes_recv": self.bytes_recv,
            "packets_sent": self.packets_sent,
            "packets_recv": self.packets_recv,
            "duration": round(self.end_time - self.start_time, 3),
            "service": self.service or SERVICE_PORTS.get(self.dst_port),
            "threat_score": self.threat_score,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

@dataclass
class Alert:
    signature_id: str
    signature_name: str
    severity: str
    category: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    
    def to_dict(self) -> dict:
        return {
            "signature_id": self.signature_id,
            "signature_name": self.signature_name,
            "severity": self.severity,
            "category": self.category,
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "src_port": self.src_port,
            "dst_port": self.dst_port,
            "protocol": self.protocol
        }

# ============================================================================
# API CLIENT
# ============================================================================

class SNSMClient:
    def __init__(self, backend_url: str, api_key: str, logger: logging.Logger):
        self.backend_url = backend_url
        self.api_key = api_key
        self.logger = logger
        self.agent_id: Optional[str] = None
        
    def _request(self, endpoint: str, data: dict) -> Optional[dict]:
        url = f"{self.backend_url}/{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}"
        }
        
        try:
            req = Request(url, data=json.dumps(data).encode(), headers=headers)
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except URLError as e:
            self.logger.error(f"API request to {endpoint} failed: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            return None
    
    def register(self, hostname: str, ip_address: str) -> bool:
        self.logger.info("Registering agent with SNSM backend...")
        
        response = self._request("agent-register", {
            "hostname": hostname,
            "ip_address": ip_address,
            "version": "1.0.0-python",
            "os": f"{platform.system()} {platform.release()}"
        })
        
        if response and "agent_id" in response:
            self.agent_id = response["agent_id"]
            self.logger.info(f"✓ Registered! Agent ID: {self.agent_id[:8]}...")
            self.logger.info(f"✓ Monitoring IP: {ip_address}")
            return True
        
        self.logger.error("Failed to register agent")
        return False
    
    def send_flows(self, flows: List[Flow]) -> bool:
        if not self.agent_id or not flows:
            return False
        
        response = self._request("agent-flows", {
            "agent_id": self.agent_id,
            "flows": [f.to_dict() for f in flows]
        })
        
        return response is not None
    
    def send_alerts(self, alerts: List[Alert]) -> bool:
        if not self.agent_id or not alerts:
            return False
        
        response = self._request("agent-suricata", {
            "agent_id": self.agent_id,
            "alerts": [a.to_dict() for a in alerts]
        })
        
        return response is not None
    
    def heartbeat(self, stats: dict) -> bool:
        if not self.agent_id:
            return False
        
        return self._request("agent-heartbeat", {
            "agent_id": self.agent_id,
            **stats
        }) is not None

# ============================================================================
# THREAT DETECTOR
# ============================================================================

class ThreatDetector:
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self.port_tracker: Dict[str, List[tuple]] = defaultdict(list)
        self.packet_tracker: Dict[str, List[float]] = defaultdict(list)
        self.rate_limiter: Dict[str, float] = {}
        self.alert_count = 0
        
    def _rate_limited(self, key: str, cooldown: int = 60) -> bool:
        now = time.time()
        if key in self.rate_limiter:
            if now - self.rate_limiter[key] < cooldown:
                return True
        self.rate_limiter[key] = now
        return False
    
    def analyze_packet(self, src_ip: str, dst_ip: str, src_port: int, 
                       dst_port: int, protocol: str, local_ip: str) -> List[Alert]:
        alerts = []
        now = time.time()
        
        # Clean old entries
        cutoff = now - 60
        self.port_tracker[src_ip] = [(p, t) for p, t in self.port_tracker[src_ip] if t > cutoff]
        self.packet_tracker[src_ip] = [t for t in self.packet_tracker[src_ip] if t > cutoff]
        
        # Track ports and packets
        if dst_port and (dst_port, now) not in self.port_tracker[src_ip]:
            self.port_tracker[src_ip].append((dst_port, now))
        self.packet_tracker[src_ip].append(now)
        
        # PORT SCAN DETECTION
        window_start = now - PORTSCAN_WINDOW
        recent_ports = set(p for p, t in self.port_tracker[src_ip] if t > window_start)
        if len(recent_ports) >= PORTSCAN_THRESHOLD:
            if not self._rate_limited(f"portscan-{src_ip}"):
                self.alert_count += 1
                alerts.append(Alert(
                    signature_id=f"SNSM-PORTSCAN-{self.alert_count}",
                    signature_name=f"Port scan detected ({len(recent_ports)} ports)",
                    severity="high",
                    category="Port Scan Detected",
                    src_ip=src_ip, dst_ip=dst_ip,
                    src_port=src_port, dst_port=dst_port,
                    protocol=protocol
                ))
                self.port_tracker[src_ip] = []
        
        # DDoS DETECTION
        window_start = now - DDOS_WINDOW
        recent_packets = [t for t in self.packet_tracker[src_ip] if t > window_start]
        if len(recent_packets) >= DDOS_THRESHOLD:
            if not self._rate_limited(f"ddos-{src_ip}"):
                self.alert_count += 1
                alerts.append(Alert(
                    signature_id=f"SNSM-DDOS-{self.alert_count}",
                    signature_name=f"High packet rate ({len(recent_packets)} pkts/{DDOS_WINDOW}s)",
                    severity="critical",
                    category="DDoS Attack Detected",
                    src_ip=src_ip, dst_ip=dst_ip,
                    src_port=src_port, dst_port=dst_port,
                    protocol=protocol
                ))
        
        # SUSPICIOUS PORT DETECTION
        if dst_port in SUSPICIOUS_PORTS and dst_ip == local_ip:
            if not self._rate_limited(f"suspicious-{src_ip}-{dst_port}", 300):
                self.alert_count += 1
                alerts.append(Alert(
                    signature_id=f"SNSM-SUSP-{self.alert_count}",
                    signature_name=f"Connection to sensitive port {dst_port}",
                    severity="medium",
                    category="Suspicious Connection",
                    src_ip=src_ip, dst_ip=dst_ip,
                    src_port=src_port, dst_port=dst_port,
                    protocol=protocol
                ))
        
        # MALICIOUS PORT DETECTION
        if dst_port in MALICIOUS_PORTS or src_port in MALICIOUS_PORTS:
            if not self._rate_limited(f"malicious-{src_ip}-{dst_port}", 60):
                self.alert_count += 1
                alerts.append(Alert(
                    signature_id=f"SNSM-MAL-{self.alert_count}",
                    signature_name=f"Known malicious port {dst_port}",
                    severity="critical",
                    category="Malicious Activity",
                    src_ip=src_ip, dst_ip=dst_ip,
                    src_port=src_port, dst_port=dst_port,
                    protocol=protocol
                ))
        
        return alerts
    
    def calculate_threat_score(self, flow: Flow, local_ip: str) -> int:
        score = 0
        
        # Large data transfer
        if flow.bytes_sent > 1_000_000:
            score += 10
        if flow.bytes_recv > 10_000_000:
            score += 15
        
        # High packet rate in short time
        duration = flow.end_time - flow.start_time
        total_packets = flow.packets_sent + flow.packets_recv
        if total_packets > 100 and duration < 5:
            score += 20
        
        # Suspicious ports
        if flow.dst_port in SUSPICIOUS_PORTS:
            score += 10
        if flow.dst_port in MALICIOUS_PORTS:
            score += 40
        
        return min(score, 100)

# ============================================================================
# PACKET CAPTURE (with Scapy)
# ============================================================================

class PacketCapture:
    def __init__(self, interface: str, logger: logging.Logger, detector: ThreatDetector):
        self.interface = interface
        self.logger = logger
        self.detector = detector
        self.flows: Dict[str, Flow] = {}
        self.local_ip = self._get_local_ip()
        self.packet_count = 0
        self.running = False
        self.pending_alerts: List[Alert] = []
        self._lock = threading.Lock()
        
    def _get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "0.0.0.0"
    
    def _flow_key(self, src_ip: str, dst_ip: str, src_port: int, 
                  dst_port: int, proto: str) -> str:
        return f"{src_ip}:{src_port}->{dst_ip}:{dst_port}:{proto}"
    
    def _process_packet(self, packet):
        try:
            from scapy.all import IP, TCP, UDP, ICMP
            
            if not packet.haslayer(IP):
                return
            
            ip = packet[IP]
            src_ip = ip.src
            dst_ip = ip.dst
            proto = "other"
            src_port = 0
            dst_port = 0
            
            if packet.haslayer(TCP):
                proto = "tcp"
                src_port = packet[TCP].sport
                dst_port = packet[TCP].dport
            elif packet.haslayer(UDP):
                proto = "udp"
                src_port = packet[UDP].sport
                dst_port = packet[UDP].dport
            elif packet.haslayer(ICMP):
                proto = "icmp"
            
            length = len(packet)
            self.packet_count += 1
            
            # Create or update flow
            key = self._flow_key(src_ip, dst_ip, src_port, dst_port, proto)
            
            with self._lock:
                if key not in self.flows:
                    self.flows[key] = Flow(
                        src_ip=src_ip, dst_ip=dst_ip,
                        src_port=src_port, dst_port=dst_port,
                        protocol=proto
                    )
                
                flow = self.flows[key]
                flow.end_time = time.time()
                
                # Determine direction
                is_outbound = (src_ip == self.local_ip or 
                              src_ip.startswith("192.168.") or
                              src_ip.startswith("10.") or
                              src_ip.startswith("172."))
                
                if is_outbound:
                    flow.bytes_sent += length
                    flow.packets_sent += 1
                else:
                    flow.bytes_recv += length
                    flow.packets_recv += 1
            
            # Analyze for threats
            alerts = self.detector.analyze_packet(
                src_ip, dst_ip, src_port, dst_port, proto, self.local_ip
            )
            if alerts:
                with self._lock:
                    self.pending_alerts.extend(alerts)
                for alert in alerts:
                    self.logger.warning(f"🚨 ALERT: {alert.signature_name} from {src_ip}")
                    
        except Exception as e:
            self.logger.debug(f"Packet processing error: {e}")
    
    def start(self):
        try:
            from scapy.all import sniff
            self.running = True
            self.logger.info(f"Starting packet capture on {self.interface}...")
            sniff(
                iface=self.interface,
                prn=self._process_packet,
                store=False,
                stop_filter=lambda x: not self.running
            )
        except ImportError:
            self.logger.error("Scapy not installed! Run: pip install scapy")
            raise
        except PermissionError:
            self.logger.error("Permission denied! Run with sudo/administrator")
            raise
    
    def stop(self):
        self.running = False
    
    def export_flows(self) -> List[Flow]:
        with self._lock:
            flows = list(self.flows.values())
            for flow in flows:
                flow.threat_score = self.detector.calculate_threat_score(flow, self.local_ip)
            self.flows = {}
            return flows
    
    def export_alerts(self) -> List[Alert]:
        with self._lock:
            alerts = self.pending_alerts
            self.pending_alerts = []
            return alerts

# ============================================================================
# SIMPLE CAPTURE (No root required)
# ============================================================================

class SimpleCapture:
    """Fallback capture using psutil - no root required but less detailed."""
    
    def __init__(self, logger: logging.Logger, detector: ThreatDetector):
        self.logger = logger
        self.detector = detector
        self.flows: Dict[str, Flow] = {}
        self.local_ip = self._get_local_ip()
        self.packet_count = 0
        self.running = False
        self.pending_alerts: List[Alert] = []
        self._lock = threading.Lock()
        
    def _get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "0.0.0.0"
    
    def _get_connections(self) -> List[dict]:
        try:
            import psutil
            connections = []
            
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == 'NONE' or not conn.raddr:
                    continue
                    
                connections.append({
                    'local_ip': conn.laddr.ip if conn.laddr else '0.0.0.0',
                    'local_port': conn.laddr.port if conn.laddr else 0,
                    'remote_ip': conn.raddr.ip if conn.raddr else '0.0.0.0',
                    'remote_port': conn.raddr.port if conn.raddr else 0,
                    'status': conn.status,
                    'protocol': 'tcp' if conn.type == socket.SOCK_STREAM else 'udp'
                })
            
            return connections
        except ImportError:
            self.logger.error("psutil not installed! Run: pip install psutil")
            return []
        except Exception as e:
            self.logger.debug(f"Error getting connections: {e}")
            return []
    
    def start(self):
        self.running = True
        self.logger.info("Starting simple connection monitoring...")
        
        while self.running:
            connections = self._get_connections()
            
            for conn in connections:
                key = f"{conn['local_ip']}:{conn['local_port']}->{conn['remote_ip']}:{conn['remote_port']}:{conn['protocol']}"
                
                with self._lock:
                    if key not in self.flows:
                        self.flows[key] = Flow(
                            src_ip=conn['local_ip'],
                            dst_ip=conn['remote_ip'],
                            src_port=conn['local_port'],
                            dst_port=conn['remote_port'],
                            protocol=conn['protocol']
                        )
                    
                    flow = self.flows[key]
                    flow.end_time = time.time()
                    flow.packets_sent += 1
                    flow.bytes_sent += 500  # Estimated
                    self.packet_count += 1
                
                # Analyze for threats
                alerts = self.detector.analyze_packet(
                    conn['remote_ip'], conn['local_ip'],
                    conn['remote_port'], conn['local_port'],
                    conn['protocol'], self.local_ip
                )
                if alerts:
                    with self._lock:
                        self.pending_alerts.extend(alerts)
                    for alert in alerts:
                        self.logger.warning(f"🚨 ALERT: {alert.signature_name}")
            
            time.sleep(1)
    
    def stop(self):
        self.running = False
    
    def export_flows(self) -> List[Flow]:
        with self._lock:
            flows = list(self.flows.values())
            for flow in flows:
                flow.threat_score = self.detector.calculate_threat_score(flow, self.local_ip)
            self.flows = {}
            return flows
    
    def export_alerts(self) -> List[Alert]:
        with self._lock:
            alerts = self.pending_alerts
            self.pending_alerts = []
            return alerts

# ============================================================================
# MAIN AGENT
# ============================================================================

class SNSMAgent:
    def __init__(self, interface: str, simple_mode: bool, verbose: bool):
        self.logger = setup_logging(verbose)
        self.client = SNSMClient(BACKEND_URL, API_KEY, self.logger)
        self.detector = ThreatDetector(self.logger)
        self.simple_mode = simple_mode
        self.interface = interface
        self.capture = None
        self.running = False
        self.start_time = time.time()
        self.total_flows = 0
        
    def _get_public_ip(self) -> str:
        try:
            req = Request("https://api.ipify.org?format=json")
            with urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode())["ip"]
        except:
            return socket.gethostbyname(socket.gethostname())
    
    def _get_system_stats(self) -> dict:
        try:
            import psutil
            return {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "packets_captured": self.capture.packet_count if self.capture else 0,
                "alerts_generated": self.detector.alert_count
            }
        except ImportError:
            return {
                "cpu_percent": 0,
                "memory_percent": 0,
                "packets_captured": self.capture.packet_count if self.capture else 0,
                "alerts_generated": self.detector.alert_count
            }
    
    def _upload_loop(self):
        last_heartbeat = time.time()
        
        while self.running:
            time.sleep(FLOW_UPLOAD_INTERVAL)
            
            if not self.capture:
                continue
            
            # Export and send flows
            flows = self.capture.export_flows()
            if flows:
                if self.client.send_flows(flows):
                    self.total_flows += len(flows)
                    self.logger.debug(f"Sent {len(flows)} flows (total: {self.total_flows})")
            
            # Export and send alerts
            alerts = self.capture.export_alerts()
            if alerts:
                self.client.send_alerts(alerts)
            
            # Heartbeat
            if time.time() - last_heartbeat >= HEARTBEAT_INTERVAL:
                self.client.heartbeat(self._get_system_stats())
                last_heartbeat = time.time()
    
    def run(self):
        self._print_banner()
        
        # Get IP and register
        public_ip = self._get_public_ip()
        hostname = socket.gethostname()
        
        if not self.client.register(hostname, public_ip):
            self.logger.error("Failed to register with backend!")
            return
        
        # Initialize capture
        if self.simple_mode:
            self.capture = SimpleCapture(self.logger, self.detector)
        else:
            self.capture = PacketCapture(self.interface, self.logger, self.detector)
        
        self.running = True
        
        # Start upload thread
        upload_thread = threading.Thread(target=self._upload_loop, daemon=True)
        upload_thread.start()
        
        self.logger.info("")
        self.logger.info("=" * 50)
        self.logger.info("Monitoring started! Press Ctrl+C to stop.")
        self.logger.info("=" * 50)
        self.logger.info("")
        
        try:
            self.capture.start()
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()
    
    def stop(self):
        self.running = False
        if self.capture:
            self.capture.stop()
        
        runtime = time.time() - self.start_time
        self.logger.info("")
        self.logger.info("=" * 50)
        self.logger.info(f"Agent stopped after {runtime/60:.1f} minutes")
        self.logger.info(f"Total flows: {self.total_flows}")
        self.logger.info(f"Total alerts: {self.detector.alert_count}")
        self.logger.info("=" * 50)
    
    def _print_banner(self):
        banner = """
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗███╗   ██╗███████╗███╗   ███╗                   ║
║   ██╔════╝████╗  ██║██╔════╝████╗ ████║                   ║
║   ███████╗██╔██╗ ██║███████╗██╔████╔██║                   ║
║   ╚════██║██║╚██╗██║╚════██║██║╚██╔╝██║                   ║
║   ███████║██║ ╚████║███████║██║ ╚═╝ ██║                   ║
║   ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝                   ║
║                                                           ║
║   Smart Network Security Module - Python Agent            ║
║   Cross-Platform Packet Capture & Analysis                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        """
        print("\033[32m" + banner + "\033[0m")

# ============================================================================
# ENTRY POINT
# ============================================================================

def list_interfaces():
    """List available network interfaces."""
    try:
        from scapy.all import get_if_list
        interfaces = get_if_list()
        print("\nAvailable interfaces:")
        for i, iface in enumerate(interfaces, 1):
            print(f"  {i}. {iface}")
        print()
        return interfaces
    except ImportError:
        print("\nScapy not installed. Install with: pip install scapy")
        print("Or use --simple mode which doesn't require scapy.\n")
        return []

def main():
    parser = argparse.ArgumentParser(
        description="SNSM Agent - Cross-Platform Network Security Monitor"
    )
    parser.add_argument(
        "-i", "--interface",
        default="",
        help="Network interface to capture on (leave empty to auto-detect)"
    )
    parser.add_argument(
        "--simple",
        action="store_true",
        help="Use simple mode (no root required, uses psutil)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available network interfaces"
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_interfaces()
        return
    
    # Handle Ctrl+C gracefully
    agent = None
    
    def signal_handler(sig, frame):
        if agent:
            agent.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Auto-detect interface if not specified
    interface = args.interface
    if not interface and not args.simple:
        try:
            from scapy.all import conf
            interface = conf.iface
        except:
            interface = "eth0"
    
    agent = SNSMAgent(interface, args.simple, args.verbose)
    agent.run()

if __name__ == "__main__":
    main()
