/**
 * SNSM IP Utilities
 * Production-ready IP detection, validation, and normalization
 */

// Private IP ranges (RFC 1918 + RFC 6598)
const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },      // Class A
  { start: '172.16.0.0', end: '172.31.255.255' },    // Class B
  { start: '192.168.0.0', end: '192.168.255.255' },  // Class C
  { start: '100.64.0.0', end: '100.127.255.255' },   // CGNAT
  { start: '127.0.0.0', end: '127.255.255.255' },    // Loopback
  { start: '169.254.0.0', end: '169.254.255.255' },  // Link-local
];

// Known VPN/Proxy provider IP patterns (basic detection)
const VPN_PROXY_INDICATORS = [
  'nordvpn', 'expressvpn', 'protonvpn', 'mullvad',
  'torproject', 'tor-exit', 'proxy', 'vpn', 'anonymizer'
];

/**
 * Convert IP address to numeric value for range comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Normalize IP address by removing IPv6 prefix and cleaning up
 */
export function normalizeIp(ip: string): string {
  if (!ip) return '';
  
  // Remove IPv6-mapped IPv4 prefix (::ffff:)
  let normalized = ip.replace(/^::ffff:/i, '');
  
  // Remove IPv6 brackets if present
  normalized = normalized.replace(/^\[|\]$/g, '');
  
  // Trim whitespace
  normalized = normalized.trim();
  
  // Handle localhost variations
  if (normalized === '::1' || normalized === 'localhost') {
    return '127.0.0.1';
  }
  
  return normalized;
}

/**
 * Validate if string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return pattern.test(ip);
}

/**
 * Validate if string is a valid IPv6 address
 */
export function isValidIPv6(ip: string): boolean {
  const pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
  return pattern.test(ip);
}

/**
 * Check if IP is in a private range (not routable on public internet)
 */
export function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  
  // Check if it's a valid IPv4 first
  if (!isValidIPv4(normalized)) {
    // IPv6 private ranges
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || 
        normalized.startsWith('fe80') || normalized === '::1') {
      return true;
    }
    return false;
  }
  
  const ipNum = ipToNumber(normalized);
  
  for (const range of PRIVATE_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    if (ipNum >= startNum && ipNum <= endNum) {
      return true;
    }
  }
  
  return false;
}

/**
 * Basic detection if IP might be from VPN/Proxy based on headers
 */
export function detectVpnProxy(headers: Headers): { isVpn: boolean; indicators: string[] } {
  const indicators: string[] = [];
  
  // Check for proxy-related headers
  const proxyHeaders = [
    'via',
    'x-forwarded-for',
    'x-proxy-id',
    'x-real-ip',
    'forwarded',
    'cf-connecting-ip',
  ];
  
  let hasMultipleForwards = false;
  const xff = headers.get('x-forwarded-for');
  if (xff && xff.split(',').length > 2) {
    hasMultipleForwards = true;
    indicators.push('multiple_proxies');
  }
  
  // Check Via header for proxy information
  const via = headers.get('via');
  if (via) {
    indicators.push('via_header_present');
    const viaLower = via.toLowerCase();
    for (const pattern of VPN_PROXY_INDICATORS) {
      if (viaLower.includes(pattern)) {
        indicators.push(`via_${pattern}`);
      }
    }
  }
  
  // Check for Cloudflare's bot/threat indicators
  const cfThreatScore = headers.get('cf-threat-score');
  if (cfThreatScore && parseInt(cfThreatScore) > 10) {
    indicators.push('elevated_cf_threat_score');
  }
  
  return {
    isVpn: indicators.length > 0 || hasMultipleForwards,
    indicators,
  };
}

/**
 * Extract the most reliable client IP from request headers
 * Handles various reverse proxy configurations
 */
export function extractIp(request: Request, connInfo?: { remoteAddr?: { hostname?: string } }): string {
  const headers = request.headers;
  
  // Priority order for IP extraction:
  // 1. CF-Connecting-IP (Cloudflare)
  // 2. True-Client-IP (Cloudflare Enterprise / Akamai)
  // 3. X-Real-IP (Nginx)
  // 4. X-Forwarded-For (first IP, standard proxy header)
  // 5. Forwarded header (RFC 7239)
  // 6. Connection info (Deno direct connection)
  
  // Cloudflare - most reliable when behind Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return normalizeIp(cfConnectingIp);
  }
  
  // True-Client-IP (Cloudflare Enterprise / Akamai)
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp) {
    return normalizeIp(trueClientIp);
  }
  
  // X-Real-IP (commonly set by Nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return normalizeIp(realIp);
  }
  
  // X-Forwarded-For - take the first (leftmost) IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // First IP is the original client
    const clientIp = normalizeIp(ips[0]);
    if (clientIp && (isValidIPv4(clientIp) || isValidIPv6(clientIp))) {
      return clientIp;
    }
  }
  
  // RFC 7239 Forwarded header
  const forwarded = headers.get('forwarded');
  if (forwarded) {
    const match = forwarded.match(/for=["']?([^"',;\s]+)/i);
    if (match) {
      return normalizeIp(match[1]);
    }
  }
  
  // Fallback to connection info (Deno)
  if (connInfo?.remoteAddr?.hostname) {
    return normalizeIp(connInfo.remoteAddr.hostname);
  }
  
  // Ultimate fallback
  return '0.0.0.0';
}

/**
 * Get comprehensive IP info for logging and analysis
 */
export function getIpInfo(request: Request, connInfo?: { remoteAddr?: { hostname?: string } }): {
  ip: string;
  normalized: string;
  isPrivate: boolean;
  isValid: boolean;
  ipVersion: 4 | 6 | null;
  vpnProxy: { isVpn: boolean; indicators: string[] };
  headers: {
    cfConnectingIp: string | null;
    xForwardedFor: string | null;
    xRealIp: string | null;
  };
} {
  const rawIp = extractIp(request, connInfo);
  const normalized = normalizeIp(rawIp);
  const isIPv4 = isValidIPv4(normalized);
  const isIPv6 = isValidIPv6(normalized);
  
  return {
    ip: rawIp,
    normalized,
    isPrivate: isPrivateIp(normalized),
    isValid: isIPv4 || isIPv6,
    ipVersion: isIPv4 ? 4 : isIPv6 ? 6 : null,
    vpnProxy: detectVpnProxy(request.headers),
    headers: {
      cfConnectingIp: request.headers.get('cf-connecting-ip'),
      xForwardedFor: request.headers.get('x-forwarded-for'),
      xRealIp: request.headers.get('x-real-ip'),
    },
  };
}

/**
 * Classify IP threat level based on characteristics
 */
export function classifyIpRisk(ipInfo: ReturnType<typeof getIpInfo>): {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let riskScore = 0;
  
  // Private IP from public request is suspicious
  if (ipInfo.isPrivate && !ipInfo.headers.cfConnectingIp) {
    reasons.push('private_ip_in_public_request');
    riskScore += 20;
  }
  
  // Invalid IP format
  if (!ipInfo.isValid) {
    reasons.push('invalid_ip_format');
    riskScore += 30;
  }
  
  // VPN/Proxy detected
  if (ipInfo.vpnProxy.isVpn) {
    reasons.push('vpn_proxy_detected');
    riskScore += 15;
    riskScore += ipInfo.vpnProxy.indicators.length * 5;
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  }
  
  return { riskLevel, riskScore, reasons };
}
