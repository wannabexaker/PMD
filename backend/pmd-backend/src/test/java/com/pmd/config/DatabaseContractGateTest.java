package com.pmd.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.project.model.Project;
import com.pmd.team.model.Team;
import com.pmd.user.model.User;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceRole;
import java.lang.reflect.Field;
import java.util.List;
import org.junit.jupiter.api.Test;

class DatabaseContractGateTest {

    @Test
    void coreEntitiesShouldExposeSchemaVersion() {
        assertThat(hasField(User.class, "schemaVersion")).isTrue();
        assertThat(hasField(Workspace.class, "schemaVersion")).isTrue();
        assertThat(hasField(Project.class, "schemaVersion")).isTrue();
        assertThat(hasField(Team.class, "schemaVersion")).isTrue();
        assertThat(hasField(WorkspaceRole.class, "schemaVersion")).isTrue();
    }

    @Test
    void workspaceScopedEntitiesShouldExposeWorkspaceId() {
        List<Class<?>> scopedClasses = List.of(
            Project.class,
            Team.class,
            WorkspaceRole.class,
            WorkspaceMember.class,
            WorkspaceInvite.class,
            WorkspaceJoinRequest.class
        );
        for (Class<?> scopedClass : scopedClasses) {
            assertThat(hasField(scopedClass, "workspaceId"))
                .withFailMessage("Expected workspaceId on %s", scopedClass.getSimpleName())
                .isTrue();
        }
    }

    private boolean hasField(Class<?> type, String fieldName) {
        for (Field field : type.getDeclaredFields()) {
            if (field.getName().equals(fieldName)) {
                return true;
            }
        }
        return false;
    }
}

