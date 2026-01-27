package com.pmd.user.service;

import com.pmd.user.model.User;
import java.time.Instant;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class UserSeeder {

    @Bean
    public CommandLineRunner seedDefaultUser(UserService userService, PasswordEncoder passwordEncoder) {
        return args -> {
            // Enterprise admin seed: idempotent and enforced at startup.
            String email = "admin1@pmd.local";
            String passwordHash = passwordEncoder.encode("admin321");
            userService.ensureAdminSeedUser(email, passwordHash, "admin", "admin", "");
        };
    }
}
