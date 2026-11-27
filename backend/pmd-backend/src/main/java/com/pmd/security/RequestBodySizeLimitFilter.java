package com.pmd.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Caps non-multipart request bodies (JSON). Tomcat bounds form posts and Spring bounds
 * multipart uploads, but nothing else stops a single JSON body of many megabytes from
 * being parsed into memory and stored. Uploads keep their own, larger, multipart limits.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestBodySizeLimitFilter extends OncePerRequestFilter {

    private final long maxBytes;
    private final ObjectProvider<CorsConfigurationSource> corsConfigurationSource;

    public RequestBodySizeLimitFilter(
        @Value("${pmd.limits.max-json-body-bytes:262144}") long maxBytes,
        @Qualifier("corsConfigurationSource") ObjectProvider<CorsConfigurationSource> corsConfigurationSource
    ) {
        this.maxBytes = maxBytes;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    /**
     * Runs before Spring Security's CORS handling, so the rejection carries the CORS headers
     * itself; otherwise the browser reports a network error and the SPA shows "server offline".
     * Written directly (no sendError) so no error dispatch can turn it into a 403.
     */
    private void reject(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        CorsConfigurationSource source = corsConfigurationSource.getIfAvailable();
        CorsConfiguration cors = source != null ? source.getCorsConfiguration(request) : null;
        String allowed = origin != null && cors != null ? cors.checkOrigin(origin) : null;
        if (allowed != null) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowed);
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
            response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        }
        response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":413,\"message\":\"Request body too large\"}");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (maxBytes <= 0) {
            return true;
        }
        String contentType = request.getContentType();
        return contentType != null && contentType.toLowerCase().startsWith("multipart/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        long declared = request.getContentLengthLong();
        if (declared > maxBytes) {
            reject(request, response);
            return;
        }
        // A chunked body has no declared length, so count what is actually read.
        chain.doFilter(declared >= 0 ? request : new LimitedRequest(request, maxBytes), response);
    }

    static final class BodyTooLargeException extends IOException {
        BodyTooLargeException() {
            super("Request body too large");
        }
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        private final long maxBytes;
        private ServletInputStream stream;

        LimitedRequest(HttpServletRequest request, long maxBytes) {
            super(request);
            this.maxBytes = maxBytes;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (stream == null) {
                stream = new LimitedStream(super.getInputStream(), maxBytes);
            }
            return stream;
        }
    }

    private static final class LimitedStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final long maxBytes;
        private long read;

        LimitedStream(ServletInputStream delegate, long maxBytes) {
            this.delegate = delegate;
            this.maxBytes = maxBytes;
        }

        private int count(int n) throws IOException {
            if (n > 0) {
                read += n;
                if (read > maxBytes) {
                    throw new BodyTooLargeException();
                }
            }
            return n;
        }

        @Override
        public int read() throws IOException {
            int b = delegate.read();
            if (b >= 0) {
                count(1);
            }
            return b;
        }

        @Override
        public int read(byte[] buffer, int off, int len) throws IOException {
            return count(delegate.read(buffer, off, len));
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener listener) {
            delegate.setReadListener(listener);
        }
    }
}
