package com.pmd.security;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClientMetadataService {

    private final boolean trustProxyHeaders;
    private final boolean storeRawClientMetadata;
    private final String hashSalt;

    public ClientMetadataService(
        @Value("${pmd.security.trust-proxy-headers:false}") boolean trustProxyHeaders,
        @Value("${pmd.security.client-metadata.store-raw:false}") boolean storeRawClientMetadata,
        @Value("${pmd.security.client-metadata.hash-salt:}") String hashSalt
    ) {
        this.trustProxyHeaders = trustProxyHeaders;
        this.storeRawClientMetadata = storeRawClientMetadata;
        this.hashSalt = hashSalt == null ? "" : hashSalt.trim();
    }

    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        if (trustProxyHeaders) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return trim(forwardedFor.split(",")[0].trim(), 120);
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return trim(realIp.trim(), 120);
            }
        }
        return trim(request.getRemoteAddr(), 120);
    }

    public String sanitizeIpForStorage(String rawIp) {
        if (rawIp == null || rawIp.isBlank()) {
            return null;
        }
        if (storeRawClientMetadata) {
            return trim(rawIp, 120);
        }
        if (rawIp.startsWith("anon:")) {
            return trim(rawIp, 120);
        }
        String masked = maskIp(rawIp);
        return trim("anon:" + masked + "|fp:" + fingerprint(rawIp), 120);
    }

    public String sanitizeUserAgentForStorage(String rawUserAgent) {
        if (rawUserAgent == null || rawUserAgent.isBlank()) {
            return null;
        }
        if (storeRawClientMetadata) {
            return trim(rawUserAgent, 300);
        }
        if (rawUserAgent.startsWith("anon:")) {
            return trim(rawUserAgent, 300);
        }
        String family = extractUserAgentFamily(rawUserAgent);
        return trim("anon:" + family + "|fp:" + fingerprint(rawUserAgent), 300);
    }

    public String sanitizeIpForLogs(String rawIp) {
        if (rawIp == null || rawIp.isBlank()) {
            return "unknown";
        }
        return maskIp(rawIp);
    }

    public String sanitizeUserAgentForLogs(String rawUserAgent) {
        if (rawUserAgent == null || rawUserAgent.isBlank()) {
            return "unknown";
        }
        return extractUserAgentFamily(rawUserAgent);
    }

    private String extractUserAgentFamily(String userAgent) {
        String normalized = userAgent.trim();
        if (normalized.isEmpty()) {
            return "unknown";
        }
        int slash = normalized.indexOf('/');
        int space = normalized.indexOf(' ');
        int end = -1;
        if (slash > 0 && space > 0) {
            end = Math.min(slash, space);
        } else if (slash > 0) {
            end = slash;
        } else if (space > 0) {
            end = space;
        }
        String family = end > 0 ? normalized.substring(0, end) : normalized;
        return trim(family.toLowerCase(), 40);
    }

    private String maskIp(String ip) {
        String normalized = ip.trim();
        if (normalized.contains(".")) {
            String[] parts = normalized.split("\\.");
            if (parts.length == 4) {
                return parts[0] + "." + parts[1] + "." + parts[2] + ".0/24";
            }
            return "ipv4/24";
        }
        if (normalized.contains(":")) {
            String[] parts = normalized.split(":");
            StringBuilder prefix = new StringBuilder();
            int limit = Math.min(4, parts.length);
            for (int i = 0; i < limit; i++) {
                if (i > 0) {
                    prefix.append(':');
                }
                prefix.append(parts[i].isBlank() ? "0" : parts[i]);
            }
            if (prefix.isEmpty()) {
                return "ipv6/64";
            }
            return prefix + ":*:*:*:*/64";
        }
        return "unknown";
    }

    private String fingerprint(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((hashSalt + "|" + value).getBytes(StandardCharsets.UTF_8));
            String hex = HexFormat.of().formatHex(hash);
            return hex.substring(0, 12);
        } catch (NoSuchAlgorithmException ex) {
            return "na";
        }
    }

    private String trim(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
