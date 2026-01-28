package com.pmd;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PmdBackendApplication {

    private static final Logger logger = LoggerFactory.getLogger(PmdBackendApplication.class);

    public static void main(String[] args) {
        String mongoUri = System.getenv("SPRING_DATA_MONGODB_URI");
        if (mongoUri != null && !mongoUri.isBlank() && System.getProperty("spring.data.mongodb.uri") == null) {
            System.setProperty("spring.data.mongodb.uri", mongoUri);
            logger.info("Configured MongoDB URI from SPRING_DATA_MONGODB_URI for this run.");
        }
        SpringApplication.run(PmdBackendApplication.class, args);
    }

}
