package com.pmd.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class PortInfoLogger implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(PortInfoLogger.class);

    private final Environment environment;

    public PortInfoLogger(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        String port = environment.getProperty("server.port", "8080");
        String profiles = String.join(",", environment.getActiveProfiles());
        logger.info("Server port set to {} (profiles: {}). Override with SERVER_PORT or --server.port.", port, profiles);
    }
}
