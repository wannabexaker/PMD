package com.pmd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PmdBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PmdBackendApplication.class, args);
    }

}
