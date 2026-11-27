package com.pmd.upload.config;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of("uploads").toAbsolutePath().toUri().toString();
        // Stored names are random UUIDs and never reused, so a file's content never changes and
        // Cloudflare can cache it. One day, not longer: an erased or replaced avatar should not
        // stay reachable at the edge for long after the file itself is gone.
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations(location)
            .setCacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic());
    }
}
