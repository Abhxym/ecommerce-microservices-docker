package com.marketplace.userservice.controller;

import com.marketplace.userservice.dto.CreateUserRequest;
import com.marketplace.userservice.dto.UserResponse;
import com.marketplace.userservice.entity.User;
import com.marketplace.userservice.exception.DuplicateEmailException;
import com.marketplace.userservice.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userRepository.findAll()
                .stream()
                .map(UserResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(UserResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request,
            UriComponentsBuilder uriBuilder
    ) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException("User with email '" + request.email() + "' already exists");
        }

        User newUser = new User(
                request.name().trim(),
                request.email().trim().toLowerCase(),
                request.city() != null ? request.city().trim() : null
        );

        User savedUser = userRepository.save(newUser);
        UserResponse response = UserResponse.fromEntity(savedUser);

        URI location = uriBuilder.path("/api/users/{id}").buildAndExpand(savedUser.getId()).toUri();
        return ResponseEntity.created(location).body(response);
    }
}

