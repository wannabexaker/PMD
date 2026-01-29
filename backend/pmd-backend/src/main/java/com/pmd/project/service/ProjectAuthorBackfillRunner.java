package com.pmd.project.service;

import com.pmd.util.StartupMongoRetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ProjectAuthorBackfillRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(ProjectAuthorBackfillRunner.class);

    public ProjectAuthorBackfillRunner() {
    }

    @Override
    public void run(ApplicationArguments args) {
        StartupMongoRetry.runWithRetry(logger, "project author/team backfill", () -> {
            logger.info("Skipping project author/team backfill: projects are now workspace-scoped.");
        });
    }
}
