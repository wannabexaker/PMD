package com.pmd.auth.security;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;
import com.pmd.security.MaliciousRequestFilter;
import com.pmd.security.RateLimitingFilter;
import com.pmd.security.AuthCsrfFilter;
import com.pmd.security.RequestIdFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final MaliciousRequestFilter maliciousRequestFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final AuthCsrfFilter authCsrfFilter;
    private final RequestIdFilter requestIdFilter;
    private final String allowedOrigins;
    private final String allowedOriginPatterns;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        MaliciousRequestFilter maliciousRequestFilter,
        RateLimitingFilter rateLimitingFilter,
        AuthCsrfFilter authCsrfFilter,
        RequestIdFilter requestIdFilter,
        @Value("${pmd.security.allowed-origins:http://localhost,http://localhost:5173,http://127.0.0.1,http://127.0.0.1:5173}") String allowedOrigins,
        @Value("${pmd.security.allowed-origin-patterns:http://localhost,http://localhost:*,http://127.0.0.1,http://127.0.0.1:*,http://192.168.*,http://192.168.*:*,http://10.*,http://10.*:*,http://172.*,http://172.*:*,http://*.local,http://*.local:*}") String allowedOriginPatterns
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.maliciousRequestFilter = maliciousRequestFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.authCsrfFilter = authCsrfFilter;
        this.requestIdFilter = requestIdFilter;
        this.allowedOrigins = allowedOrigins;
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .headers(headers -> {
                headers.contentTypeOptions(Customizer.withDefaults());
                headers.frameOptions(frame -> frame.deny());
                headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.SAME_ORIGIN));
                headers.permissionsPolicy(policy -> policy.policy("camera=(), geolocation=(), microphone=()"));
                headers.contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; frame-ancestors 'none'; object-src 'none'"
                ));
            })
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/confirm").permitAll()
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(authCsrfFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(maliciousRequestFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("JWT-only authentication");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> originPatterns = List.of(allowedOriginPatterns.split(",")).stream()
            .map(String::trim)
            .filter(pattern -> !pattern.isEmpty())
            .collect(Collectors.toList());
        if (!originPatterns.isEmpty()) {
            configuration.setAllowedOriginPatterns(originPatterns);
        } else {
            configuration.setAllowedOrigins(
                List.of(allowedOrigins.split(",")).stream()
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .collect(Collectors.toList())
            );
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "X-PMD-CSRF", "X-Request-Id"));
        configuration.setExposedHeaders(List.of("X-RateLimit-Limit-Minute", "X-RateLimit-Remaining-Minute", "Retry-After", "X-Request-Id"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
