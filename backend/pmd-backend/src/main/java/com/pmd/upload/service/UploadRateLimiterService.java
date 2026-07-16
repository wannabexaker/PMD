package com.pmd.upload.service;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Caps how many files one account can upload per hour.
 *
 * <p>The upload endpoint is authenticated but otherwise open, and stored files that are never
 * referenced are not cleaned up, so without a cap a single account could script thousands of
 * 2 MB uploads and fill the Pi's SD card. With comment attachments disabled the only honest use
 * is the occasional avatar change, so a low ceiling costs real users nothing while removing the
 * abuse vector. In-memory and per-instance, which is fine for a single-node deployment.
 */
@Service
public class UploadRateLimiterService {

    private final int maxPerHour;
    private final LoadingCache<String, AtomicInteger> uploadsByUser;

    public UploadRateLimiterService(@Value("${pmd.uploads.rate-limit.per-hour:20}") int maxPerHour) {
        this.maxPerHour = maxPerHour;
        this.uploadsByUser = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
    }

    /** Counts this upload and rejects with 429 once the hourly ceiling is passed. */
    public void checkAndRecord(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        try {
            if (uploadsByUser.get(userId).incrementAndGet() > maxPerHour) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "You have uploaded too many files. Please try again later.");
            }
        } catch (ExecutionException ex) {
            // The loader cannot fail; if it somehow does, do not block a legitimate upload.
        }
    }
}
