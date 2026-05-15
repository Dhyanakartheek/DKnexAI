package com.dknex.ai;

import com.dknex.ai.entity.ERole;
import com.dknex.ai.entity.Role;
import com.dknex.ai.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds required roles into the database on application startup.
 * Roles (ROLE_USER, ROLE_ADMIN) must exist in the 'roles' table
 * for signup/login to work correctly.
 */
@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        seedRole(ERole.ROLE_USER);
        seedRole(ERole.ROLE_ADMIN);
        logger.info("Database roles seeded successfully.");
    }

    private void seedRole(ERole roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = new Role();
            role.setName(roleName);
            roleRepository.save(role);
            logger.info("Created role: {}", roleName);
        }
    }
}
