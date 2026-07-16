package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.util.StartupMongoRetry;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

/**
 * Strips the platform-admin flag from every account whose email is not explicitly allowlisted.
 *
 * <p>A platform admin can enter any workspace, so the flag is the most valuable bit in the
 * database — and it is only a bit. Anything that can write the users collection could mint
 * an admin; this makes such a bit worthless past the next startup unless the operator also
 * controls the deployment environment, which is a different key ({@code
 * PMD_SECURITY_ADMIN_EMAILS} on the host) than the database password.
 *
 * <p>Blank allowlist = sweep disabled, loudly. That keeps dev setups working (the demo
 * seeder's admin would otherwise vanish every restart) and means a production deploy that
 * forgets the variable degrades to today's behaviour instead of locking the operator out.
 *
 * <p>Runs {@link Ordered#LOWEST_PRECEDENCE last} so it sweeps after the seeders: nothing
 * they mint in the same startup survives unchecked.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class AdminAllowlistGuard implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminAllowlistGuard.class);

    private final Set<String> allowedEmails;
    private final MongoTemplate mongo;

    public AdminAllowlistGuard(@Value("${pmd.security.admin-emails:}") String adminEmails,
                               MongoTemplate mongo) {
        this.allowedEmails = Arrays.stream(adminEmails.split(","))
            .map(email -> email.trim().toLowerCase(Locale.ROOT))
            .filter(email -> !email.isEmpty())
            .collect(Collectors.toUnmodifiableSet());
        this.mongo = mongo;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (allowedEmails.isEmpty()) {
            logger.warn("No admin allowlist configured (PMD_SECURITY_ADMIN_EMAILS); "
                + "the admin-flag sweep is disabled and any isAdmin bit in the database is trusted as-is.");
            return;
        }
        StartupMongoRetry.runWithRetry(logger, "admin allowlist sweep", this::sweep);
    }

    private void sweep() {
        List<User> admins = mongo.find(new Query(Criteria.where("isAdmin").is(true)), User.class);
        for (User admin : admins) {
            String email = admin.getEmail() != null ? admin.getEmail().trim().toLowerCase(Locale.ROOT) : "";
            if (allowedEmails.contains(email)) {
                continue;
            }
            mongo.updateFirst(
                new Query(Criteria.where("_id").is(admin.getId())),
                new Update().set("isAdmin", false),
                User.class);
            // ERROR, not info: an un-allowlisted admin bit is an incident, whatever its origin.
            logger.error("Stripped platform-admin flag from un-allowlisted account {} ({})",
                admin.getId(), admin.getEmail());
        }
    }
}
