package com.pmd.auth.service;

import java.util.regex.Pattern;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordPolicyService {

    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern LOWER = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("\\d");
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9]");
    private static final Set<String> COMMON_PASSWORDS = Set.of(
        "123456", "12345678", "123123", "password", "password1", "qwerty",
        "admin", "admin123", "letmein", "welcome", "iloveyou", "111111", "000000"
    );

    public void validateForRegister(String password) {
        if (password == null || password.length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 10 characters.");
        }
        if (!UPPER.matcher(password).find()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include an uppercase letter.");
        }
        if (!LOWER.matcher(password).find()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a lowercase letter.");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a number.");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include a symbol.");
        }
        String lowered = password.toLowerCase();
        if (COMMON_PASSWORDS.contains(lowered)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too common.");
        }
    }
}
