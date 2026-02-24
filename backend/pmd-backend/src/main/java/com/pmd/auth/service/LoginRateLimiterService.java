package com.pmd.auth.service;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import java.time.Instant;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginRateLimiterService {

    private final int maxAttemptsPerIpWindow;
    private final int maxAttemptsPerUserWindow;
    private final long lockMinutes;

    private final LoadingCache<String, AtomicInteger> attemptsByIp;
    private final LoadingCache<String, AtomicInteger> attemptsByUser;
    private final LoadingCache<String, Instant> lockByIp;
    private final LoadingCache<String, Instant> lockByUser;

    public LoginRateLimiterService(
        @Value("${pmd.security.auth-rate-limit.ip-per-10-min:40}") int maxAttemptsPerIpWindow,
        @Value("${pmd.security.auth-rate-limit.user-per-10-min:12}") int maxAttemptsPerUserWindow,
        @Value("${pmd.security.auth-rate-limit.lock-minutes:15}") long lockMinutes
    ) {
        this.maxAttemptsPerIpWindow = maxAttemptsPerIpWindow;
        this.maxAttemptsPerUserWindow = maxAttemptsPerUserWindow;
        this.lockMinutes = lockMinutes;
        this.attemptsByIp = CacheBuilder.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
        this.attemptsByUser = CacheBuilder.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
        this.lockByIp = CacheBuilder.newBuilder()
            .expireAfterWrite(lockMinutes, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public Instant load(String key) {
                    return Instant.EPOCH;
                }
            });
        this.lockByUser = CacheBuilder.newBuilder()
            .expireAfterWrite(lockMinutes, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public Instant load(String key) {
                    return Instant.EPOCH;
                }
            });
    }

    public void checkAllowed(String clientIp, String username) {
        Instant now = Instant.now();
        try {
            if (lockByIp.get(clientIp).isAfter(now) || lockByUser.get(username).isAfter(now)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Try later.");
            }
        } catch (ExecutionException ex) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Try later.");
        }
    }

    public void recordFailure(String clientIp, String username) {
        try {
            int ipAttempts = attemptsByIp.get(clientIp).incrementAndGet();
            int userAttempts = attemptsByUser.get(username).incrementAndGet();
            Instant lockedUntil = Instant.now().plusSeconds(lockMinutes * 60);
            if (ipAttempts >= maxAttemptsPerIpWindow) {
                lockByIp.put(clientIp, lockedUntil);
            }
            if (userAttempts >= maxAttemptsPerUserWindow) {
                lockByUser.put(username, lockedUntil);
            }
        } catch (ExecutionException ignored) {
        }
    }

    public void recordSuccess(String clientIp, String username) {
        attemptsByIp.invalidate(clientIp);
        attemptsByUser.invalidate(username);
        lockByIp.invalidate(clientIp);
        lockByUser.invalidate(username);
    }
}
