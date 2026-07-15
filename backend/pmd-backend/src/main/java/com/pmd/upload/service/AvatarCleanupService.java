package com.pmd.upload.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

/**
 * Removes avatar files that nothing points at any more.
 *
 * <p>Uploads are served from /uploads, which is permitAll, so a file left behind stays
 * publicly downloadable at its URL forever. That matters twice: erasure has to actually
 * remove the photo, and replacing a photo should not quietly leave the old one online.
 *
 * <p>Callers must persist the new state <em>before</em> calling this — the reference check
 * reads the database, so an unsaved change would make the old URL look still-in-use.
 */
@Service
public class AvatarCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(AvatarCleanupService.class);

    private final MongoTemplate mongo;
    private final UploadService uploadService;

    public AvatarCleanupService(MongoTemplate mongo, UploadService uploadService) {
        this.mongo = mongo;
        this.uploadService = uploadService;
    }

    /**
     * Deletes the file behind {@code avatarUrl} unless a user or workspace still references it.
     *
     * <p>avatarUrl reaches us from client-supplied fields, so two things guard this: the
     * reference check stops someone aiming their own avatarUrl at another user's photo and
     * having it deleted on their behalf, and {@link UploadService#deleteByUrl} refuses any
     * URL we did not mint, so it can never be coerced into a path.
     *
     * @param reason short context for the log line; never contains personal data.
     */
    public void deleteIfUnreferenced(String avatarUrl, String reason) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return;
        }
        boolean stillReferenced =
            mongo.exists(new Query(Criteria.where("avatarUrl").is(avatarUrl)), "users")
            || mongo.exists(new Query(Criteria.where("avatarUrl").is(avatarUrl)), "workspaces");
        if (stillReferenced) {
            return;
        }
        if (uploadService.deleteByUrl(avatarUrl)) {
            logger.info("Deleted unreferenced avatar file ({})", reason);
        }
    }
}
