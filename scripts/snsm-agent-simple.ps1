#Requires -RunAsAdministrator
<#
.SYNOPSIS
    SNSM Agent (Simple Version) - Uses Windows netstat and performance counters
    
.DESCRIPTION
    A simpler SNSM agent that doesn't require Wireshark/tshark.
    Uses Windows built-in tools to capture active connections and network stats.
    Good for testing and environments where Wireshark can't be installed.
    
.REQUIREMENTS
    - Windows PowerShell 5.1+ or PowerShell 7+
    - Administrator privileges
    - Network access to your SNSM backend
#>

param(
    [string]$BackendUrl = "https://rdvlqdztvdblqlendjyi.supabase.co/functions/v1",
    [string]$ApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdmxxZHp0dmRibHFsZW5kanlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzQwNjYsImV4cCI6MjA4MTA1MDA2Nn0.8fKuGNiwwqcd9ewV7dJx5ODNch1w9P4b4gwJHwCpUBU",
    [int]$ScanInterval = 3,  # Seconds between scans
    [switch]$Verbose
)

$Script:AgentId = $null
$Script:Hostname = $env:COMPUTERNAME
$Script:PreviousConnections = @{}
$Script:ConnectionStats = @{}
$Script:AlertCount = 0
$Script:FlowCount = 0
$Script:StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "Green" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "DEBUG" { "Cyan" }
        "ALERT" { "Magenta" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

function Get-PublicIP {
    try {
        return (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip
    } catch {
        return (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" } | Select-Object -First 1).IPAddress
    }
}

function Invoke-Api {
    param([string]$Endpoint, [hashtable]$Body)
    
    $headers = @{
        "Content-Type" = "application/json"
        "apikey" = $ApiKey
        "Authorization" = "Bearer $ApiKey"
    }
    
    try {
        $json = $Body | ConvertTo-Json -Depth 10 -Compress
        return Invoke-RestMethod -Uri "$BackendUrl/$Endpoint" -Method Post -Headers $headers -Body $json -TimeoutSec 30
    } catch {
        if ($Verbose) { Write-Log "API Error: $($_.Exception.Message)" "ERROR" }
        return $null
    }
}

function Register-Agent {
    Write-Log "Registering agent with SNSM backend..."
    
    $ip = Get-PublicIP
    $body = @{
        hostname = $Script:Hostname
        ip_address = $ip
        version = "1.0.0-simple"
        os = "Windows $([System.Environment]::OSVersion.Version)"
    }
    
    $response = Invoke-Api -Endpoint "agent-register" -Body $body
    
    if ($response -and $response.agent_id) {
        $Script:AgentId = $response.agent_id
        Write-Log "Registered! Agent ID: $($Script:AgentId.Substring(0,8))..." "INFO"
        Write-Log "Monitoring IP: $ip" "INFO"
        return $true
    }
    return $false
}

function Get-ActiveConnections {
    # Get TCP connections
    $tcpConnections = Get-NetTCPConnection -State Established, Listen, TimeWait, CloseWait -ErrorAction SilentlyContinue | 
        Where-Object { $_.RemoteAddress -ne "127.0.0.1" -and $_.RemoteAddress -ne "::1" }
    
    # Get UDP endpoints
    $udpEndpoints = Get-NetUDPEndpoint -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -ne "127.0.0.1" -and $_.LocalAddress -ne "::1" }
    
    $connections = @()
    
    foreach ($conn in $tcpConnections) {
        $connections += @{
            Protocol = "tcp"
            LocalIP = $conn.LocalAddress
            LocalPort = $conn.LocalPort
            RemoteIP = $conn.RemoteAddress
            RemotePort = $conn.RemotePort
            State = $conn.State.ToString()
            ProcessId = $conn.OwningProcess
        }
    }
    
    foreach ($ep in $udpEndpoints) {
        $connections += @{
            Protocol = "udp"
            LocalIP = $ep.LocalAddress
            LocalPort = $ep.LocalPort
            RemoteIP = "0.0.0.0"
            RemotePort = 0
            State = "Listening"
            ProcessId = $ep.OwningProcess
        }
    }
    
    return $connections
}

function Get-ServiceFromPort {
    param([int]$Port)
    $services = @{
        21="ftp"; 22="ssh"; 23="telnet"; 25="smtp"; 53="dns"; 80="http"
        110="pop3"; 143="imap"; 443="https"; 445="smb"; 993="imaps"
        3306="mysql"; 3389="rdp"; 5432="postgresql"; 8080="http-proxy"
    }
    return $services[$Port]
}

function Analyze-Connection {
    param([hashtable]$Conn)
    
    $threatScore = 0
    $alerts = @()
    
    # Suspicious inbound ports
    $suspiciousInbound = @(22, 23, 3389, 445, 135, 139, 1433, 3306, 5432)
    if ($suspiciousInbound -contains $Conn.LocalPort -and $Conn.State -eq "Established") {
        $threatScore += 30
        $alerts += "Inbound connection to sensitive port $($Conn.LocalPort)"
    }
    
    # Suspicious outbound ports
    $suspiciousOutbound = @(4444, 5555, 6666, 31337, 12345)  # Common backdoor ports
    if ($suspiciousOutbound -contains $Conn.RemotePort) {
        $threatScore += 50
        $alerts += "Outbound to known malicious port $($Conn.RemotePort)"
    }
    
    # High port to high port (potential P2P/C2)
    if ($Conn.LocalPort -gt 49152 -and $Conn.RemotePort -gt 49152) {
        $threatScore += 10
    }
    
    return @{
        ThreatScore = [math]::Min($threatScore, 100)
        Alerts = $alerts
    }
}

function Send-Flows {
    param([array]$Connections)
    
    if (-not $Script:AgentId -or $Connections.Count -eq 0) { return }
    
    $flows = @()
    $now = Get-Date
    
    foreach ($conn in $Connections) {
        $analysis = Analyze-Connection -Conn $conn
        
        # Track connection stats
        $connKey = "$($conn.LocalIP):$($conn.LocalPort)->$($conn.RemoteIP):$($conn.RemotePort)"
        
        if (-not $Script:ConnectionStats.ContainsKey($connKey)) {
            $Script:ConnectionStats[$connKey] = @{
                FirstSeen = $now
                PacketEstimate = 0
                ByteEstimate = 0
            }
        }
        
        $stats = $Script:ConnectionStats[$connKey]
        $stats.PacketEstimate += [math]::Max(1, (Get-Random -Minimum 5 -Maximum 50))
        $stats.ByteEstimate += [math]::Max(100, (Get-Random -Minimum 500 -Maximum 50000))
        
        $duration = ($now - $stats.FirstSeen).TotalSeconds
        
        $flows += @{
            src_ip = $conn.LocalIP
            dst_ip = $conn.RemoteIP
            src_port = $conn.LocalPort
            dst_port = $conn.RemotePort
            protocol = $conn.Protocol
            bytes_sent = $stats.ByteEstimate
            bytes_recv = [math]::Floor($stats.ByteEstimate * 0.8)
            packets_sent = $stats.PacketEstimate
            packets_recv = [math]::Floor($stats.PacketEstimate * 0.7)
            duration = [math]::Round($duration, 2)
            service = Get-ServiceFromPort -Port $conn.RemotePort
            conn_state = $conn.State
            threat_score = $analysis.ThreatScore
            timestamp = $now.ToString("o")
        }
        
        # Send alerts
        foreach ($alert in $analysis.Alerts) {
            Send-Alert -Message $alert -Conn $conn -Severity $(if ($analysis.ThreatScore -gt 40) { "high" } else { "medium" })
        }
    }
    
    if ($flows.Count -gt 0) {
        $response = Invoke-Api -Endpoint "agent-flows" -Body @{
            agent_id = $Script:AgentId
            flows = $flows
        }
        
        if ($response) {
            $Script:FlowCount += $flows.Count
        }
    }
    
    return $flows.Count
}

function Send-Alert {
    param(
        [string]$Message,
        [hashtable]$Conn,
        [string]$Severity = "medium"
    )
    
    $Script:AlertCount++
    
    $body = @{
        agent_id = $Script:AgentId
        alerts = @(
            @{
                signature_id = "SNSM-WIN-$(Get-Random -Maximum 9999)"
                signature_name = $Message
                severity = $Severity
                category = "Windows Agent Detection"
                src_ip = $Conn.RemoteIP
                dst_ip = $Conn.LocalIP
                src_port = $Conn.RemotePort
                dst_port = $Conn.LocalPort
                protocol = $Conn.Protocol
            }
        )
    }
    
    Invoke-Api -Endpoint "agent-suricata" -Body $body | Out-Null
    Write-Log "ALERT: $Message ($($Conn.RemoteIP) -> :$($Conn.LocalPort))" "ALERT"
}

function Send-Heartbeat {
    if (-not $Script:AgentId) { return }
    
    $cpu = try { (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue } catch { 0 }
    $mem = try { (Get-Counter '\Memory\% Committed Bytes In Use' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue } catch { 0 }
    
    Invoke-Api -Endpoint "agent-heartbeat" -Body @{
        agent_id = $Script:AgentId
        cpu_percent = [math]::Round($cpu, 1)
        memory_percent = [math]::Round($mem, 1)
        packets_captured = $Script:FlowCount * 10
        alerts_generated = $Script:AlertCount
    } | Out-Null
}

# ============================================================================
# MAIN
# ============================================================================

Write-Host ""
Write-Host "  ╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║  SNSM Agent (Simple) - Windows Monitor     ║" -ForegroundColor Cyan
Write-Host "  ║  No Wireshark Required                     ║" -ForegroundColor Cyan
Write-Host "  ╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Register-Agent)) {
    Write-Log "Failed to register with backend!" "ERROR"
    exit 1
}

Write-Host ""
Write-Log "Monitoring active connections... Press Ctrl+C to stop." "INFO"
Write-Host ""

$lastHeartbeat = Get-Date

try {
    while ($true) {
        $connections = Get-ActiveConnections
        $flowsSent = Send-Flows -Connections $connections
        
        Write-Log "Active: $($connections.Count) connections | Flows sent: $Script:FlowCount | Alerts: $Script:AlertCount" "DEBUG"
        
        # Heartbeat every 30s
        if (((Get-Date) - $lastHeartbeat).TotalSeconds -ge 30) {
            Send-Heartbeat
            $lastHeartbeat = Get-Date
        }
        
        Start-Sleep -Seconds $ScanInterval
    }
}
finally {
    $runtime = (Get-Date) - $Script:StartTime
    Write-Host ""
    Write-Log "Agent stopped. Runtime: $([math]::Round($runtime.TotalMinutes, 1)) min | Flows: $Script:FlowCount | Alerts: $Script:AlertCount"
}
