package com.marketplace.userservice.config;

import com.marketplace.userservice.entity.User;
import com.marketplace.userservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.List;

@Configuration
@Profile("dev")
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.saveAll(List.of(
                    new User("Priya Sharma", "priya.sharma@example.com", "Pune"),
                    new User("Rohan Patil", "rohan.patil@example.com", "Mumbai"),
                    new User("Ananya Iyer", "ananya.iyer@example.com", "Bengaluru")
            ));
            System.out.println(">> [DEV Profile] Seeded 3 default users from db/init.sql into memory database.");
        }
    }
}

