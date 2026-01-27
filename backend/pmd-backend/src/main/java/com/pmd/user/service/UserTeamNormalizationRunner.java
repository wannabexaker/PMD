package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class UserTeamNormalizationRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(UserTeamNormalizationRunner.class);

    private final UserRepository userRepository;

    public UserTeamNormalizationRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<User> users = userRepository.findAll();
        boolean updated = false;
        for (User user : users) {
            String team = user.getTeam();
            if (team != null && (team.equalsIgnoreCase("admin") || team.equalsIgnoreCase("admins"))) {
                if (!"admin".equals(team)) {
                    user.setTeam("admin");
                    updated = true;
                }
            }
        }
        if (updated) {
            userRepository.saveAll(users);
            logger.info("Normalized admin team to 'admin' for existing users.");
        }
    }
}
