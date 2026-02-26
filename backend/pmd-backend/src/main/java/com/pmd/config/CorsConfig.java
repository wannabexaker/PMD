package com.pmd.config;

import java.util.Arrays;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${pmd.security.allowed-origins:http://localhost,http://localhost:5173,http://127.0.0.1,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Value("${pmd.security.allowed-origin-patterns:http://localhost,http://localhost:*,http://127.0.0.1,http://127.0.0.1:*,http://192.168.*,http://192.168.*:*,http://10.*,http://10.*:*,http://172.*,http://172.*:*,http://*.local,http://*.local:*}")
    private String allowedOriginPatterns;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] originPatterns = Arrays.stream(allowedOriginPatterns.split(","))
            .map(String::trim)
            .filter(pattern -> !pattern.isEmpty())
            .toArray(String[]::new);
        CorsRegistration reg = registry.addMapping("/api/**");
        if (originPatterns.length > 0) {
            reg.allowedOriginPatterns(originPatterns);
        } else {
            String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
            reg.allowedOrigins(origins);
        }
        reg
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
            .allowedHeaders("Content-Type", "Authorization", "X-Requested-With", "X-PMD-CSRF", "X-Request-Id")
            .exposedHeaders("X-RateLimit-Limit-Minute", "X-RateLimit-Remaining-Minute", "Retry-After", "X-Request-Id")
            .allowCredentials(true);
    }
}
