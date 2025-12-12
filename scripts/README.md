# SNSM Agents

Cross-platform agents for capturing real network traffic and sending it to your SNSM dashboard.

## Quick Start

### Python Agent (Recommended - Cross-Platform)

Works on **Linux**, **macOS**, and **Windows**.

```bash
# Install dependencies
pip install scapy requests psutil

# Run with packet capture (requires root/admin)
sudo python3 snsm-agent.py

# Or run in simple mode (no root required)
python3 snsm-agent.py --simple
```

### Windows PowerShell Agents

```powershell
# Simple mode (no Wireshark needed)
.\snsm-agent-simple.ps1

# Full mode (requires Wireshark)
.\snsm-agent-windows.ps1
```

## Agent Comparison

| Feature | Python (scapy) | Python (simple) | PowerShell (tshark) | PowerShell (simple) |
|---------|---------------|-----------------|---------------------|---------------------|
| **Platforms** | Linux/Mac/Win | Linux/Mac/Win | Windows | Windows |
| **Root Required** | Yes | No | Yes | No |
| **Dependencies** | scapy, psutil | psutil | Wireshark | None |
| **Packet Capture** | ✅ Real | ❌ Estimated | ✅ Real | ❌ Estimated |
| **DDoS Detection** | ✅ | ⚠️ Limited | ✅ | ⚠️ Limited |
| **Port Scan Detection** | ✅ | ✅ | ✅ | ✅ |

## Python Agent Usage

```bash
# List available interfaces
sudo python3 snsm-agent.py --list

# Capture on specific interface
sudo python3 snsm-agent.py -i eth0

# Simple mode (connection monitoring only)
python3 snsm-agent.py --simple

# Verbose output
sudo python3 snsm-agent.py -v
```

### Installing Dependencies

```bash
# All platforms
pip install scapy requests psutil

# Linux (may need additional packages)
sudo apt install python3-scapy   # Debian/Ubuntu
sudo yum install python3-scapy   # RHEL/CentOS

# macOS
brew install python3
pip3 install scapy requests psutil
```

## Testing Your DoS Attack

1. **Start the agent:**
   ```bash
   sudo python3 snsm-agent.py
   ```

2. **In another terminal, run your DoS test**

3. **Watch the dashboard** - you should see:
   - Network Traffic Flow chart updating
   - New alerts in Live Threat Feed
   - Threat scores increasing
   - "DDoS Attack Detected" alerts (if threshold exceeded)

## Detection Thresholds

| Detection | Threshold | Window |
|-----------|-----------|--------|
| Port Scan | 20+ unique ports | 10 seconds |
| DDoS | 100+ packets | 5 seconds |
| Suspicious Port | Single connection | - |
| Malicious Port | Single connection | - |

## PowerShell Agent Parameters

```powershell
# Full agent
.\snsm-agent-windows.ps1 `
    -TsharkPath "C:\Program Files\Wireshark\tshark.exe" `
    -Interface 1 `
    -FlowInterval 5 `
    -Verbose

# Simple agent
.\snsm-agent-simple.ps1 `
    -ScanInterval 3 `
    -Verbose
```

## Troubleshooting

### Python Agent

**"Permission denied"**
```bash
# Run with sudo/root
sudo python3 snsm-agent.py

# Or use simple mode
python3 snsm-agent.py --simple
```

**"No module named scapy"**
```bash
pip install scapy
# or
pip3 install scapy
```

**"No interfaces found"**
```bash
# List interfaces
sudo python3 snsm-agent.py --list
# Then specify one
sudo python3 snsm-agent.py -i eth0
```

### PowerShell Agent

**"tshark not found"**
Install Wireshark from https://www.wireshark.org/download.html

**"Access denied"**
Run PowerShell as Administrator

**"Execution policy"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### No Data on Dashboard

1. Check agent shows "Registered!" message
2. Verify your firewall allows outbound HTTPS
3. Check the agent ID matches in backend logs
4. Ensure you're generating network traffic

## Architecture

```
┌─────────────────────┐
│  Your Windows PC    │
│                     │
│  ┌───────────────┐  │
│  │ SNSM Agent    │  │
│  │ (PowerShell)  │  │
│  └───────┬───────┘  │
│          │          │
│    Capture Packets  │
│          │          │
└──────────┼──────────┘
           │
           │ HTTPS POST
           ▼
┌─────────────────────┐
│  SNSM Backend       │
│  (Supabase Edge)    │
│                     │
│  /agent-register    │
│  /agent-flows       │
│  /agent-suricata    │
│  /agent-heartbeat   │
└──────────┬──────────┘
           │
           │ Real-time
           ▼
┌─────────────────────┐
│  SNSM Dashboard     │
│  (React UI)         │
│                     │
│  Live charts        │
│  Threat feed        │
│  Alert panels       │
└─────────────────────┘
```

## Security Notes

- The agent sends data to your SNSM backend using your project's anon key
- Traffic data is stored in your Supabase database
- No data is sent to third parties
- Run only on networks you own/have permission to monitor
