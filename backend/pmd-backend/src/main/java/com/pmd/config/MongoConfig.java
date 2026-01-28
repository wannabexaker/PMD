package com.pmd.config;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

@Configuration
public class MongoConfig {

    private static final Logger logger = LoggerFactory.getLogger(MongoConfig.class);

    private final String mongoUri;

    public MongoConfig(Environment environment) {
        String uri = environment.getProperty("SPRING_DATA_MONGODB_URI");
        if (uri == null || uri.isBlank()) {
            uri = environment.getProperty("spring.data.mongodb.uri");
        }
        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException("SPRING_DATA_MONGODB_URI (or spring.data.mongodb.uri) must be set for MongoDB.");
        }
        this.mongoUri = uri;
    }

    @Bean
    public MongoClient mongoClient() {
        logger.info("Using MongoDB URI from configuration for application MongoClient.");
        return MongoClients.create(mongoUri);
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoClient mongoClient) {
        ConnectionString connectionString = new ConnectionString(mongoUri);
        String database = connectionString.getDatabase();
        if (database == null || database.isBlank()) {
            throw new IllegalStateException("MongoDB URI must include a database name, e.g. mongodb://mongo:27017/pmd");
        }
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(mongoClient, database));
    }
}
