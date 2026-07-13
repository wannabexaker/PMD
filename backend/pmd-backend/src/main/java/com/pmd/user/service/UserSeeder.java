package com.pmd.user.service;

import com.pmd.util.StartupMongoRetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class UserSeeder {

    private static final Logger logger = LoggerFactory.getLogger(UserSeeder.class);

    /**
     * Optional admin bootstrap. Seeds an admin account ONLY when an admin password
     * is explicitly configured (pmd.seed.admin.password / PMD_SEED_ADMIN_PASSWORD).
     * This deliberately has no default password, so a public/production deployment
     * never ships with a known-credentials admin account. In dev/demo runs the
     * DemoSeeder still provisions its own admin.
     */
    @Bean
    public CommandLineRunner seedDefaultUser(
            UserService userService,
            PasswordEncoder passwordEncoder,
            @Value("${pmd.seed.admin.email:admin1@pmd.local}") String adminEmail,
            @Value("${pmd.seed.admin.password:}") String adminPassword) {
        return args -> {
            if (adminPassword == null || adminPassword.isBlank()) {
                logger.info("Admin seed disabled (no pmd.seed.admin.password configured).");
                return;
            }
            StartupMongoRetry.runWithRetry(logger, "admin seed user", () -> {
                String passwordHash = passwordEncoder.encode(adminPassword);
                userService.ensureAdminSeedUser(adminEmail, passwordHash, "admin", "admin", "");
            });
        };
    }
}
