# SNSM Windows Agents

Two PowerShell agents for capturing real network traffic and sending it to your SNSM dashboard.

## Quick Start

### Option 1: Simple Agent (No Dependencies)

Uses Windows built-in commands to monitor active connections. Best for quick testing.

```powershell
# Run as Administrator
.\snsm-agent-simple.ps1
```

### Option 2: Full Agent (With Wireshark/tshark)

Captures actual packets for more accurate traffic analysis. Requires Wireshark.

```powershell
# Install Wireshark first: https://www.wireshark.org/download.html
# Make sure to include "TShark" component during installation

# Run as Administrator
.\snsm-agent-windows.ps1
```

## Requirements

| Agent | Requirements |
|-------|-------------|
| Simple | Windows PowerShell 5.1+, Administrator privileges |
| Full | All above + Wireshark with tshark |

## Features

### Both Agents
- ✅ Auto-register with SNSM backend
- ✅ Real-time flow data to dashboard
- ✅ Threat detection & alerts
- ✅ System resource monitoring (CPU, memory)
- ✅ Heartbeat to maintain online status

### Full Agent (tshark)
- ✅ Actual packet capture
- ✅ Accurate byte/packet counts
- ✅ DDoS detection
- ✅ Port scan detection
- ✅ Protocol analysis

### Simple Agent (netstat)
- ✅ No external dependencies
- ✅ Connection state tracking
- ✅ Suspicious port detection
- ✅ Estimated traffic metrics

## Testing Your DoS Attack

1. Start the agent:
   ```powershell
   # As Administrator
   .\snsm-agent-windows.ps1
   ```

2. In another terminal, run your DoS test:
   ```powershell
   # Example: hping3 or your preferred tool
   ```

3. Watch the dashboard - you should see:
   - Network Traffic Flow chart updating
   - New alerts in Live Threat Feed
   - Threat scores increasing
   - "DDoS Attack Detected" alerts (if threshold exceeded)

## Parameters

### snsm-agent-windows.ps1
```powershell
.\snsm-agent-windows.ps1 `
    -TsharkPath "C:\Program Files\Wireshark\tshark.exe" `
    -Interface 1 `              # Network interface number
    -FlowInterval 5 `           # Seconds between uploads
    -Verbose                    # Show debug output
```

### snsm-agent-simple.ps1
```powershell
.\snsm-agent-simple.ps1 `
    -ScanInterval 3 `           # Seconds between scans
    -Verbose                    # Show debug output
```

## Troubleshooting

### "tshark not found"
Install Wireshark and ensure tshark.exe is installed (it's an optional component).

### "Access denied"
Run PowerShell as Administrator (right-click → Run as Administrator).

### "Execution policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### No data on dashboard
1. Check agent shows "Registered!" message
2. Verify your firewall allows outbound HTTPS
3. Check the agent ID matches in backend logs

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
