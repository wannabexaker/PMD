package com.pmd.upload.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Deletes uploaded files that nothing references. An avatar is uploaded first and only
 * then saved onto a profile, so a user who uploads and never saves (or uploads many times)
 * leaves files behind that no replace/erasure path ever reaches. Files younger than the
 * grace period are left alone so an upload is never swept between upload and save.
 */
@Service
public class OrphanUploadSweepService {

    private static final Logger logger = LoggerFactory.getLogger(OrphanUploadSweepService.class);
    static final Duration GRACE = Duration.ofHours(24);

    private final MongoTemplate mongo;
    private final UploadService uploadService;

    public OrphanUploadSweepService(MongoTemplate mongo, UploadService uploadService) {
        this.mongo = mongo;
        this.uploadService = uploadService;
    }

    @Scheduled(cron = "0 47 3 * * *")
    public void sweepNightly() {
        int deleted = sweep(Instant.now());
        if (deleted > 0) {
            logger.info("Orphan upload sweep removed {} file(s)", deleted);
        }
    }

    int sweep(Instant now) {
        int deleted = 0;
        for (Path file : uploadService.listStoredFiles()) {
            try {
                if (Files.getLastModifiedTime(file).toInstant().isAfter(now.minus(GRACE))) {
                    continue;
                }
            } catch (IOException ex) {
                continue;
            }
            String url = UploadService.UPLOAD_URL_PREFIX + file.getFileName();
            if (isReferenced(url)) {
                continue;
            }
            if (uploadService.deleteByUrl(url)) {
                deleted++;
            }
        }
        return deleted;
    }

    private boolean isReferenced(String url) {
        // Every persisted field that can hold an upload URL.
        return mongo.exists(new Query(Criteria.where("avatarUrl").is(url)), "users")
            || mongo.exists(new Query(Criteria.where("avatarUrl").is(url)), "workspaces")
            || mongo.exists(new Query(Criteria.where("attachment.url").is(url)), "project_comments");
    }
}
