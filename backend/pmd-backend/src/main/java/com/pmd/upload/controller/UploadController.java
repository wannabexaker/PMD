package com.pmd.upload.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.upload.dto.UploadResponse;
import com.pmd.upload.service.UploadRateLimiterService;
import com.pmd.upload.service.UploadService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final UploadService uploadService;
    private final UserService userService;
    private final UploadRateLimiterService uploadRateLimiterService;

    public UploadController(UploadService uploadService, UserService userService,
                           UploadRateLimiterService uploadRateLimiterService) {
        this.uploadService = uploadService;
        this.userService = userService;
        this.uploadRateLimiterService = uploadRateLimiterService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse upload(@RequestParam("file") MultipartFile file, Authentication authentication) {
        User requester = getRequester(authentication);
        // Bound how many files one account can store per hour so a scripted client cannot fill
        // the disk. Counted before storing, so a rejected upload never touches the filesystem.
        uploadRateLimiterService.checkAndRecord(requester.getId());
        return uploadService.store(file);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
