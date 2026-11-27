package com.pmd.upload.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Stored uploads are public, cacheable files. Cloudflare caches them without separating CORS
 * variants (it ignores Vary: Origin), so a copy first fetched by a plain {@code <img>} would be
 * served without CORS headers to the SPA's later cross-origin {@code fetch} (avatar re-crop).
 * Sending {@code Access-Control-Allow-Origin: *} on every upload response makes every cached
 * copy usable. No credentials are involved: the SPA fetches uploads with credentials omitted.
 * Spring's CORS processing leaves a response that already carries the header alone.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class UploadsCorsHeaderFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        return !("GET".equals(method) || "HEAD".equals(method))
            || !request.getRequestURI().startsWith("/uploads/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        response.setHeader("Access-Control-Allow-Origin", "*");
        chain.doFilter(request, response);
    }
}
