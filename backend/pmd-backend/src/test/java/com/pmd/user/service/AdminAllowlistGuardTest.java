package com.pmd.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;

/**
 * The admin flag is the most valuable bit in the database. These tests pin the guard's
 * contract: with an allowlist, only listed emails may hold it past startup; without one,
 * the sweep must not run at all (a forgotten variable must degrade to today's behaviour,
 * never lock the operator out).
 */
@SpringBootTest(properties = "pmd.security.admin-emails=Keeper@PMD.local")
class AdminAllowlistGuardTest {

    @Autowired
    private AdminAllowlistGuard guard;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    // The keeper's email is fixed (it has to match the allowlist property), so this test is not
    // self-isolating by construction. Clear the collection first — and, now that a unique index
    // on username exists, a leftover keeper from a prior run would otherwise fail the insert.
    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    private User user(String email, boolean admin) {
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setDisplayName(email);
        user.setAdmin(admin);
        return userRepository.save(user);
    }

    @Test
    void keepsAllowlistedAdminStripsEveryoneElse() {
        // Mixed case on both sides on purpose: the comparison must not be case-sensitive.
        User keeper = user("keeper@pmd.LOCAL", true);
        User intruder = user("intruder-" + System.nanoTime() + "@pmd.local", true);
        User bystander = user("bystander-" + System.nanoTime() + "@pmd.local", false);

        guard.run(null);

        assertThat(userRepository.findById(keeper.getId()).orElseThrow().isAdmin()).isTrue();
        assertThat(userRepository.findById(intruder.getId()).orElseThrow().isAdmin()).isFalse();
        assertThat(userRepository.findById(bystander.getId()).orElseThrow().isAdmin()).isFalse();
    }

    @Test
    void blankAllowlistDisablesTheSweepInsteadOfStrippingEveryone() {
        User admin = user("survivor-" + System.nanoTime() + "@pmd.local", true);

        new AdminAllowlistGuard("", mongoTemplate).run(null);

        assertThat(userRepository.findById(admin.getId()).orElseThrow().isAdmin()).isTrue();
    }
}
