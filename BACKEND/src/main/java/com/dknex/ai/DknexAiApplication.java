package com.dknex.ai;

import com.dknex.ai.entity.ERole;
import com.dknex.ai.entity.Role;
import com.dknex.ai.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DknexAiApplication {

	public static void main(String[] args) {
		SpringApplication.run(DknexAiApplication.class, args);
	}

	@Bean
	CommandLineRunner initRoles(RoleRepository roleRepository) {
		return args -> {
			if (roleRepository.findByName(ERole.ROLE_USER).isEmpty()) {
				roleRepository.save(new Role(null, ERole.ROLE_USER));
			}
			if (roleRepository.findByName(ERole.ROLE_ADMIN).isEmpty()) {
				roleRepository.save(new Role(null, ERole.ROLE_ADMIN));
			}
		};
	}
}
