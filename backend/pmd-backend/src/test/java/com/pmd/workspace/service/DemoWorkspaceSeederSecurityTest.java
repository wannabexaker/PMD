package com.pmd.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * The demo workspace is seeded with realistic member documents. They must never be
 * login-capable: a usable password on them would mint 11 real accounts (one an Owner) on
 * every registration, with a credential from the source and an email that embeds the
 * workspace id. This pins that invariant so it cannot silently regress.
 */
@SpringBootTest
class DemoWorkspaceSeederSecurityTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void seededDemoUsersCannotLogIn() {
        User owner = new User();
        owner.setUsername("demo-owner-" + System.nanoTime() + "@pmd.local");
        owner.setEmail(owner.getUsername());
        owner.setDisplayName("Demo Owner");
        owner = userRepository.save(owner);

        String workspaceId = workspaceService.getOrCreateDemoWorkspace(owner).workspace().getId();

        // The seeded members are real user docs with emails like name+<workspaceId>@pmd.local.
        List<User> demoUsers = userRepository.findAll().stream()
            .filter(u -> u.getEmail() != null && u.getEmail().endsWith("+" + workspaceId + "@pmd.local"))
            .toList();

        // Sanity: the seeder actually ran, otherwise the assertion below is vacuous.
        assertThat(demoUsers).isNotEmpty();
        // No usable password hash and no googleId => AuthController.login rejects the blank hash,
        // and there is no other way in. The account is unreachable.
        assertThat(demoUsers).allSatisfy(user -> {
            assertThat(user.getPasswordHash() == null || user.getPasswordHash().isBlank())
                .as("demo user %s must have no usable password", user.getEmail())
                .isTrue();
            assertThat(user.getGoogleId())
                .as("demo user %s must have no Google identity", user.getEmail())
                .isNull();
        });
    }
}
