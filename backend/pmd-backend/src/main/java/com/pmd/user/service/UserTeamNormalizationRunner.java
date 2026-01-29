package com.pmd.user.service;

import com.pmd.util.StartupMongoRetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class UserTeamNormalizationRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(UserTeamNormalizationRunner.class);

    public UserTeamNormalizationRunner() {
    }

    @Override
    public void run(ApplicationArguments args) {
        StartupMongoRetry.runWithRetry(logger, "user team normalization", () -> {
            logger.info("Skipping user team normalization: teams are now workspace-scoped.");
        });
    }
}
