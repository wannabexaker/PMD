package com.pmd.util;

import org.slf4j.Logger;
import org.springframework.dao.DataAccessException;

public final class StartupMongoRetry {

    private static final int MAX_ATTEMPTS = 5;
    private static final long BACKOFF_MILLIS = 3000;

    private StartupMongoRetry() {
    }

    public static void runWithRetry(Logger logger, String taskName, Runnable action) {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                action.run();
                return;
            } catch (DataAccessException ex) {
                if (attempt == MAX_ATTEMPTS) {
                    logger.warn("Skipping {} after {} attempts due to MongoDB not being ready.", taskName, attempt, ex);
                    return;
                }
                logger.warn("MongoDB not ready for {} (attempt {}/{}). Retrying in {} ms.", taskName, attempt, MAX_ATTEMPTS, BACKOFF_MILLIS);
                if (!sleep()) {
                    logger.warn("Interrupted while waiting to retry {}. Skipping.", taskName);
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private static boolean sleep() {
        try {
            Thread.sleep(BACKOFF_MILLIS);
            return true;
        } catch (InterruptedException ex) {
            return false;
        }
    }
}
