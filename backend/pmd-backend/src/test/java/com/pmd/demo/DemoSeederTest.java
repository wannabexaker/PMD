package com.pmd.demo;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

/**
 * The demo seeder creates a platform administrator whose password is in the source file.
 * Only the active profile keeps that away from production, so these guard that boundary.
 * Collaborators are null on purpose: nothing may be touched before the check.
 */
class DemoSeederTest {

    private DemoSeeder seederFor(MockEnvironment environment) {
        return new DemoSeeder(environment, null, null, null, null);
    }

    @Test
    void refusesToStartWhenDemoSeedingIsEnabledInProduction() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("docker", "prod");
        environment.setProperty("PMD_SEED_DEMO", "true");

        assertThatThrownBy(() -> seederFor(environment).run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("prod");
    }

    @Test
    void refusesEvenWhenTheDevProfileIsWhatEnabledIt() {
        // dev + prod together is a misconfiguration, not a licence to seed.
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev", "prod");

        assertThatThrownBy(() -> seederFor(environment).run(null))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void leavesProductionAloneWhenSeedingIsNotEnabled() {
        // The normal production case: the guard must not become a startup failure of its own.
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("docker", "prod");

        assertThatCode(() -> seederFor(environment).run(null)).doesNotThrowAnyException();
    }
}
