package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.util.StartupMongoRetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class UserSeeder {

    private static final Logger logger = LoggerFactory.getLogger(UserSeeder.class);

    @Bean
    public CommandLineRunner seedDefaultUser(UserService userService, PasswordEncoder passwordEncoder) {
        return args -> {
            StartupMongoRetry.runWithRetry(logger, "admin seed user", () -> {
                // Enterprise admin seed: idempotent and enforced at startup.
                String email = "admin1@pmd.local";
                String passwordHash = passwordEncoder.encode("admin321");
                userService.ensureAdminSeedUser(email, passwordHash, "admin", "admin", "");
            });
        };
    }
}
