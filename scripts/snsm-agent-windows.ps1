#Requires -RunAsAdministrator
<#
.SYNOPSIS
    SNSM Agent for Windows - Real-time Network Traffic Capture and Analysis
    
.DESCRIPTION
    This script captures live network traffic using tshark (Wireshark CLI),
    aggregates packets into flows, and sends them to your SNSM backend for
    analysis and visualization on the dashboard.
    
.REQUIREMENTS
    - Windows PowerShell 5.1+ or PowerShell 7+
    - Wireshark installed (with tshark in PATH or specify path below)
    - Administrator privileges (for packet capture)
    - Network access to your SNSM backend
    
.NOTES
    Author: SNSM Security Platform
    Version: 1.0.0
#>

param(
    [string]$BackendUrl = "https://rdvlqdztvdblqlendjyi.supabase.co/functions/v1",
    [string]$ApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdmxxZHp0dmRibHFsZW5kanlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzQwNjYsImV4cCI6MjA4MTA1MDA2Nn0.8fKuGNiwwqcd9ewV7dJx5ODNch1w9P4b4gwJHwCpUBU",
    [string]$TsharkPath = "C:\Program Files\Wireshark\tshark.exe",
    [string]$Interface = "",  # Leave empty to auto-detect
    [int]$FlowInterval = 5,   # Seconds between flow uploads
    [int]$MaxPacketsPerBatch = 100,
    [switch]$Verbose
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:AgentId = $null
$Script:Hostname = $env:COMPUTERNAME
$Script:LocalIP = $null
$Script:Flows = @{}
$Script:PacketCount = 0
$Script:AlertCount = 0
$Script:StartTime = Get-Date

# Suspicious patterns for alert generation
$Script:SuspiciousPatterns = @{
    PortScan = @{ Threshold = 20; Window = 10 }      # 20+ ports in 10 seconds
    DDoS = @{ Threshold = 100; Window = 5 }           # 100+ packets in 5 seconds from same source
    BruteForce = @{ Threshold = 10; Window = 60 }     # 10+ auth attempts in 60 seconds
}

$Script:ConnectionTracker = @{}
$Script:RateLimiter = @{}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "Green" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "DEBUG" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Get-LocalIPAddress {
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | 
               Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.PrefixOrigin -ne "WellKnown" } | 
               Select-Object -First 1).IPAddress
        return $ip
    } catch {
        return "0.0.0.0"
    }
}

function Get-PublicIPAddress {
    try {
        $response = Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5
        return $response.ip
    } catch {
        Write-Log "Could not detect public IP: $_" "WARN"
        return $null
    }
}

function Find-TsharkPath {
    # Check common installation paths
    $paths = @(
        $TsharkPath,
        "C:\Program Files\Wireshark\tshark.exe",
        "C:\Program Files (x86)\Wireshark\tshark.exe",
        (Get-Command tshark -ErrorAction SilentlyContinue).Source
    )
    
    foreach ($path in $paths) {
        if ($path -and (Test-Path $path)) {
            return $path
        }
    }
    return $null
}

function Get-NetworkInterfaces {
    $tshark = Find-TsharkPath
    if (-not $tshark) { return @() }
    
    try {
        $output = & $tshark -D 2>&1
        $interfaces = @()
        foreach ($line in $output) {
            if ($line -match "^(\d+)\.\s+(.+)$") {
                $interfaces += @{
                    Index = $matches[1]
                    Name = $matches[2]
                }
            }
        }
        return $interfaces
    } catch {
        return @()
    }
}

# ============================================================================
# API FUNCTIONS
# ============================================================================

function Invoke-SNSMApi {
    param(
        [string]$Endpoint,
        [hashtable]$Body
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "apikey" = $ApiKey
        "Authorization" = "Bearer $ApiKey"
    }
    
    try {
        $json = $Body | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$BackendUrl/$Endpoint" -Method Post -Headers $headers -Body $json -TimeoutSec 30
        return $response
    } catch {
        Write-Log "API call to $Endpoint failed: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Register-Agent {
    Write-Log "Registering agent with SNSM backend..."
    
    $publicIP = Get-PublicIPAddress
    $Script:LocalIP = Get-LocalIPAddress
    
    $body = @{
        hostname = $Script:Hostname
        ip_address = if ($publicIP) { $publicIP } else { $Script:LocalIP }
        version = "1.0.0"
        os = "Windows $([System.Environment]::OSVersion.Version)"
    }
    
    $response = Invoke-SNSMApi -Endpoint "agent-register" -Body $body
    
    if ($response -and $response.agent_id) {
        $Script:AgentId = $response.agent_id
        Write-Log "Agent registered successfully! ID: $($Script:AgentId)" "INFO"
        Write-Log "Monitoring IP: $($body.ip_address)" "INFO"
        return $true
    } else {
        Write-Log "Failed to register agent" "ERROR"
        return $false
    }
}

function Send-Heartbeat {
    if (-not $Script:AgentId) { return }
    
    $cpuUsage = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
    $memUsage = (Get-Counter '\Memory\% Committed Bytes In Use' -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
    
    $body = @{
        agent_id = $Script:AgentId
        cpu_percent = [math]::Round($cpuUsage, 1)
        memory_percent = [math]::Round($memUsage, 1)
        network_bps = $Script:PacketCount * 100  # Approximate
        packets_captured = $Script:PacketCount
        alerts_generated = $Script:AlertCount
    }
    
    Invoke-SNSMApi -Endpoint "agent-heartbeat" -Body $body | Out-Null
}

function Send-Flows {
    param([array]$FlowData)
    
    if (-not $Script:AgentId -or $FlowData.Count -eq 0) { return }
    
    $body = @{
        agent_id = $Script:AgentId
        flows = $FlowData
    }
    
    $response = Invoke-SNSMApi -Endpoint "agent-flows" -Body $body
    if ($response) {
        Write-Log "Sent $($FlowData.Count) flows to backend" "DEBUG"
    }
}

function Send-Alert {
    param(
        [string]$Category,
        [string]$SignatureName,
        [string]$Severity,
        [string]$SrcIP,
        [string]$DstIP,
        [int]$SrcPort,
        [int]$DstPort,
        [string]$Protocol
    )
    
    if (-not $Script:AgentId) { return }
    
    $Script:AlertCount++
    
    $body = @{
        agent_id = $Script:AgentId
        alerts = @(
            @{
                signature_id = "SNSM-$(Get-Random -Maximum 9999)"
                signature_name = $SignatureName
                severity = $Severity
                category = $Category
                src_ip = $SrcIP
                dst_ip = $DstIP
                src_port = $SrcPort
                dst_port = $DstPort
                protocol = $Protocol
            }
        )
    }
    
    $response = Invoke-SNSMApi -Endpoint "agent-suricata" -Body $body
    if ($response) {
        Write-Log "Alert sent: $SignatureName from $SrcIP" "WARN"
    }
}

# ============================================================================
# PACKET CAPTURE & ANALYSIS
# ============================================================================

function Start-PacketCapture {
    param([string]$InterfaceIndex)
    
    $tshark = Find-TsharkPath
    if (-not $tshark) {
        Write-Log "tshark not found! Please install Wireshark." "ERROR"
        return $null
    }
    
    Write-Log "Starting packet capture on interface $InterfaceIndex..."
    
    # Capture fields: timestamp, src_ip, dst_ip, src_port, dst_port, protocol, length
    $fields = "-e frame.time_epoch -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport -e udp.srcport -e udp.dstport -e ip.proto -e frame.len"
    
    $arguments = "-i $InterfaceIndex -T fields $fields -E separator=| -l -q"
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $tshark
    $processInfo.Arguments = $arguments
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    return $process
}

function Parse-PacketLine {
    param([string]$Line)
    
    $parts = $Line -split '\|'
    if ($parts.Count -lt 5) { return $null }
    
    $timestamp = $parts[0]
    $srcIP = $parts[1]
    $dstIP = $parts[2]
    $tcpSrcPort = $parts[3]
    $tcpDstPort = $parts[4]
    $udpSrcPort = $parts[5]
    $udpDstPort = $parts[6]
    $protoNum = $parts[7]
    $length = $parts[8]
    
    # Determine protocol
    $protocol = switch ($protoNum) {
        "6" { "tcp" }
        "17" { "udp" }
        "1" { "icmp" }
        default { "other" }
    }
    
    # Get ports based on protocol
    $srcPort = if ($tcpSrcPort) { [int]$tcpSrcPort } elseif ($udpSrcPort) { [int]$udpSrcPort } else { 0 }
    $dstPort = if ($tcpDstPort) { [int]$tcpDstPort } elseif ($udpDstPort) { [int]$udpDstPort } else { 0 }
    
    if (-not $srcIP -or -not $dstIP) { return $null }
    
    return @{
        Timestamp = $timestamp
        SrcIP = $srcIP
        DstIP = $dstIP
        SrcPort = $srcPort
        DstPort = $dstPort
        Protocol = $protocol
        Length = [int]$length
    }
}

function Add-PacketToFlow {
    param([hashtable]$Packet)
    
    if (-not $Packet) { return }
    
    $Script:PacketCount++
    
    # Create flow key (5-tuple)
    $flowKey = "$($Packet.SrcIP):$($Packet.SrcPort)->$($Packet.DstIP):$($Packet.DstPort):$($Packet.Protocol)"
    
    if (-not $Script:Flows.ContainsKey($flowKey)) {
        $Script:Flows[$flowKey] = @{
            src_ip = $Packet.SrcIP
            dst_ip = $Packet.DstIP
            src_port = $Packet.SrcPort
            dst_port = $Packet.DstPort
            protocol = $Packet.Protocol
            bytes_sent = 0
            bytes_recv = 0
            packets_sent = 0
            packets_recv = 0
            start_time = [double]$Packet.Timestamp
            end_time = [double]$Packet.Timestamp
            service = Get-ServiceFromPort -Port $Packet.DstPort
        }
    }
    
    $flow = $Script:Flows[$flowKey]
    
    # Determine direction based on local IP
    $isOutbound = $Packet.SrcIP -eq $Script:LocalIP -or $Packet.SrcIP -match "^192\.168\." -or $Packet.SrcIP -match "^10\." -or $Packet.SrcIP -match "^172\.(1[6-9]|2[0-9]|3[01])\."
    
    if ($isOutbound) {
        $flow.bytes_sent += $Packet.Length
        $flow.packets_sent++
    } else {
        $flow.bytes_recv += $Packet.Length
        $flow.packets_recv++
    }
    
    $flow.end_time = [double]$Packet.Timestamp
    
    # Check for suspicious activity
    Analyze-PacketForThreats -Packet $Packet
}

function Get-ServiceFromPort {
    param([int]$Port)
    
    $services = @{
        20 = "ftp-data"; 21 = "ftp"; 22 = "ssh"; 23 = "telnet"; 25 = "smtp"
        53 = "dns"; 80 = "http"; 110 = "pop3"; 143 = "imap"; 443 = "https"
        445 = "smb"; 993 = "imaps"; 995 = "pop3s"; 3306 = "mysql"
        3389 = "rdp"; 5432 = "postgresql"; 8080 = "http-proxy"; 8443 = "https-alt"
    }
    
    return $services[$Port]
}

function Analyze-PacketForThreats {
    param([hashtable]$Packet)
    
    $srcKey = $Packet.SrcIP
    $now = [DateTime]::UtcNow
    
    # Initialize tracker for this IP
    if (-not $Script:ConnectionTracker.ContainsKey($srcKey)) {
        $Script:ConnectionTracker[$srcKey] = @{
            Ports = @()
            PacketTimes = @()
            AuthAttempts = @()
        }
    }
    
    $tracker = $Script:ConnectionTracker[$srcKey]
    
    # Track unique ports (port scan detection)
    if ($Packet.DstPort -and $tracker.Ports -notcontains $Packet.DstPort) {
        $tracker.Ports += $Packet.DstPort
    }
    
    # Track packet times (DDoS detection)
    $tracker.PacketTimes += $now
    
    # Clean old entries (keep last 60 seconds)
    $cutoff = $now.AddSeconds(-60)
    $tracker.Ports = @($tracker.Ports | Select-Object -Last 100)
    $tracker.PacketTimes = @($tracker.PacketTimes | Where-Object { $_ -gt $cutoff })
    
    # PORT SCAN DETECTION
    $recentPorts = @($tracker.Ports | Select-Object -Last $Script:SuspiciousPatterns.PortScan.Threshold)
    if ($recentPorts.Count -ge $Script:SuspiciousPatterns.PortScan.Threshold) {
        $rateKey = "portscan-$srcKey"
        if (-not $Script:RateLimiter.ContainsKey($rateKey) -or $Script:RateLimiter[$rateKey] -lt $now.AddMinutes(-1)) {
            Send-Alert -Category "Port Scan Detected" -SignatureName "Possible port scanning activity" `
                       -Severity "high" -SrcIP $Packet.SrcIP -DstIP $Packet.DstIP `
                       -SrcPort $Packet.SrcPort -DstPort $Packet.DstPort -Protocol $Packet.Protocol
            $Script:RateLimiter[$rateKey] = $now
            $tracker.Ports = @()  # Reset
        }
    }
    
    # DDoS DETECTION
    $windowStart = $now.AddSeconds(-$Script:SuspiciousPatterns.DDoS.Window)
    $recentPackets = @($tracker.PacketTimes | Where-Object { $_ -gt $windowStart })
    if ($recentPackets.Count -ge $Script:SuspiciousPatterns.DDoS.Threshold) {
        $rateKey = "ddos-$srcKey"
        if (-not $Script:RateLimiter.ContainsKey($rateKey) -or $Script:RateLimiter[$rateKey] -lt $now.AddMinutes(-1)) {
            Send-Alert -Category "DDoS Attack Detected" -SignatureName "High packet rate from single source" `
                       -Severity "critical" -SrcIP $Packet.SrcIP -DstIP $Packet.DstIP `
                       -SrcPort $Packet.SrcPort -DstPort $Packet.DstPort -Protocol $Packet.Protocol
            $Script:RateLimiter[$rateKey] = $now
        }
    }
    
    # SUSPICIOUS PORT DETECTION
    $suspiciousPorts = @(22, 23, 3389, 445, 135, 139, 1433, 3306, 5432)
    if ($suspiciousPorts -contains $Packet.DstPort) {
        $rateKey = "suspicious-$srcKey-$($Packet.DstPort)"
        if (-not $Script:RateLimiter.ContainsKey($rateKey) -or $Script:RateLimiter[$rateKey] -lt $now.AddMinutes(-5)) {
            Send-Alert -Category "Suspicious Connection" -SignatureName "Connection to sensitive port $($Packet.DstPort)" `
                       -Severity "medium" -SrcIP $Packet.SrcIP -DstIP $Packet.DstIP `
                       -SrcPort $Packet.SrcPort -DstPort $Packet.DstPort -Protocol $Packet.Protocol
            $Script:RateLimiter[$rateKey] = $now
        }
    }
}

function Export-Flows {
    $flowList = @()
    $now = [DateTime]::UtcNow
    
    foreach ($key in @($Script:Flows.Keys)) {
        $flow = $Script:Flows[$key]
        
        # Calculate duration
        $duration = $flow.end_time - $flow.start_time
        if ($duration -lt 0) { $duration = 0 }
        
        # Calculate threat score based on characteristics
        $threatScore = 0
        
        # High bytes ratio might indicate data exfiltration
        if ($flow.bytes_sent -gt 1000000) { $threatScore += 10 }
        if ($flow.bytes_recv -gt 10000000) { $threatScore += 15 }
        
        # Many packets in short time might indicate attack
        $totalPackets = $flow.packets_sent + $flow.packets_recv
        if ($totalPackets -gt 100 -and $duration -lt 5) { $threatScore += 20 }
        
        # Suspicious ports
        if ($flow.dst_port -in @(22, 23, 3389, 445)) { $threatScore += 10 }
        
        $flowList += @{
            src_ip = $flow.src_ip
            dst_ip = $flow.dst_ip
            src_port = $flow.src_port
            dst_port = $flow.dst_port
            protocol = $flow.protocol
            bytes_sent = $flow.bytes_sent
            bytes_recv = $flow.bytes_recv
            packets_sent = $flow.packets_sent
            packets_recv = $flow.packets_recv
            duration = [math]::Round($duration, 3)
            service = $flow.service
            threat_score = [math]::Min($threatScore, 100)
            timestamp = $now.ToString("o")
        }
    }
    
    # Clear flows after export
    $Script:Flows = @{}
    
    return $flowList
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

function Show-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║                                                           ║" -ForegroundColor Green
    Write-Host "  ║   ███████╗███╗   ██╗███████╗███╗   ███╗                   ║" -ForegroundColor Green
    Write-Host "  ║   ██╔════╝████╗  ██║██╔════╝████╗ ████║                   ║" -ForegroundColor Green
    Write-Host "  ║   ███████╗██╔██╗ ██║███████╗██╔████╔██║                   ║" -ForegroundColor Green
    Write-Host "  ║   ╚════██║██║╚██╗██║╚════██║██║╚██╔╝██║                   ║" -ForegroundColor Green
    Write-Host "  ║   ███████║██║ ╚████║███████║██║ ╚═╝ ██║                   ║" -ForegroundColor Green
    Write-Host "  ║   ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝                   ║" -ForegroundColor Green
    Write-Host "  ║                                                           ║" -ForegroundColor Green
    Write-Host "  ║   Smart Network Security Module - Windows Agent           ║" -ForegroundColor Green
    Write-Host "  ║   Real-time Packet Capture & Analysis                     ║" -ForegroundColor Green
    Write-Host "  ║                                                           ║" -ForegroundColor Green
    Write-Host "  ╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
}

function Start-SNSMAgent {
    Show-Banner
    
    # Check for tshark
    $tshark = Find-TsharkPath
    if (-not $tshark) {
        Write-Log "ERROR: Wireshark/tshark not found!" "ERROR"
        Write-Host ""
        Write-Host "Please install Wireshark from: https://www.wireshark.org/download.html" -ForegroundColor Yellow
        Write-Host "Make sure to include 'TShark' component during installation." -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    Write-Log "Found tshark at: $tshark"
    
    # List and select interface
    $interfaces = Get-NetworkInterfaces
    if ($interfaces.Count -eq 0) {
        Write-Log "No network interfaces found!" "ERROR"
        return
    }
    
    Write-Host ""
    Write-Host "Available Network Interfaces:" -ForegroundColor Cyan
    foreach ($iface in $interfaces) {
        Write-Host "  $($iface.Index). $($iface.Name)" -ForegroundColor White
    }
    Write-Host ""
    
    $selectedInterface = $Interface
    if (-not $selectedInterface) {
        $selectedInterface = Read-Host "Enter interface number to capture (or press Enter for default)"
        if (-not $selectedInterface) {
            $selectedInterface = $interfaces[0].Index
        }
    }
    
    Write-Log "Selected interface: $selectedInterface"
    Write-Host ""
    
    # Register with backend
    if (-not (Register-Agent)) {
        Write-Log "Failed to register with backend. Exiting." "ERROR"
        return
    }
    
    Write-Host ""
    Write-Log "Starting packet capture... Press Ctrl+C to stop." "INFO"
    Write-Host ""
    
    # Start tshark process
    $captureProcess = Start-PacketCapture -InterfaceIndex $selectedInterface
    
    if (-not $captureProcess) {
        Write-Log "Failed to start packet capture!" "ERROR"
        return
    }
    
    try {
        $captureProcess.Start() | Out-Null
        
        $lastFlowUpload = Get-Date
        $lastHeartbeat = Get-Date
        
        # Read packets asynchronously
        while (-not $captureProcess.HasExited) {
            # Read available output
            while (-not $captureProcess.StandardOutput.EndOfStream) {
                $line = $captureProcess.StandardOutput.ReadLine()
                
                if ($line) {
                    $packet = Parse-PacketLine -Line $line
                    if ($packet) {
                        Add-PacketToFlow -Packet $packet
                    }
                }
                
                # Check if it's time to upload flows
                $now = Get-Date
                if (($now - $lastFlowUpload).TotalSeconds -ge $FlowInterval) {
                    $flows = Export-Flows
                    if ($flows.Count -gt 0) {
                        Send-Flows -FlowData $flows
                        Write-Log "Captured $($Script:PacketCount) packets, sent $($flows.Count) flows" "INFO"
                    }
                    $lastFlowUpload = $now
                }
                
                # Send heartbeat every 30 seconds
                if (($now - $lastHeartbeat).TotalSeconds -ge 30) {
                    Send-Heartbeat
                    $lastHeartbeat = $now
                }
            }
            
            Start-Sleep -Milliseconds 100
        }
    }
    catch {
        Write-Log "Capture interrupted: $($_.Exception.Message)" "WARN"
    }
    finally {
        if ($captureProcess -and -not $captureProcess.HasExited) {
            $captureProcess.Kill()
        }
        
        # Final upload
        $flows = Export-Flows
        if ($flows.Count -gt 0) {
            Send-Flows -FlowData $flows
        }
        
        $runtime = (Get-Date) - $Script:StartTime
        Write-Host ""
        Write-Log "Agent stopped. Runtime: $([math]::Round($runtime.TotalMinutes, 1)) minutes"
        Write-Log "Total packets captured: $($Script:PacketCount)"
        Write-Log "Total alerts generated: $($Script:AlertCount)"
    }
}

# Run the agent
Start-SNSMAgent
