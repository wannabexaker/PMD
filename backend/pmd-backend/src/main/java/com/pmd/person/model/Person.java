package com.pmd.person.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("people")
public class Person {

    @Id
    private String id;

    private String displayName;

    private String email;

    @Indexed
    private String workspaceId;

    private Instant createdAt;

    public Person() {
    }

    public Person(String id, String displayName, String email, String workspaceId, Instant createdAt) {
        this.id = id;
        this.displayName = displayName;
        this.email = email;
        this.workspaceId = workspaceId;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
