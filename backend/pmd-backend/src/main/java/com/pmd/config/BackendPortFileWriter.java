package com.pmd.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.server.context.WebServerInitializedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "dev"})
public class BackendPortFileWriter implements ApplicationListener<WebServerInitializedEvent> {

    private static final Logger logger = LoggerFactory.getLogger(BackendPortFileWriter.class);

    @Value("${PMD_RUNTIME_PORT_FILE:}")
    private String portFile;

    @Override
    public void onApplicationEvent(WebServerInitializedEvent event) {
        if (portFile == null || portFile.isBlank()) {
            return;
        }
        int port = event.getWebServer().getPort();
        try {
            Path path = Path.of(portFile);
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(
                    path,
                    Integer.toString(port),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING);
            logger.info("Wrote backend port {} to {}", port, path.toAbsolutePath());
        } catch (Exception ex) {
            logger.warn("Failed to write backend port file {}: {}", portFile, ex.getMessage());
        }
    }
}
