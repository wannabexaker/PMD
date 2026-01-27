package com.pmd.person.dto;

import jakarta.validation.constraints.NotBlank;

public class PersonRequest {

    @NotBlank
    private String displayName;

    private String email;

    public PersonRequest() {
    }

    public PersonRequest(String displayName, String email) {
        this.displayName = displayName;
        this.email = email;
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
}