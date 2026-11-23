package com.marketplace.authservice.service;

import com.marketplace.authservice.client.UserServiceClient;
import com.marketplace.authservice.dto.*;
import com.marketplace.authservice.entity.Credential;
import com.marketplace.authservice.exception.BadRequestException;
import com.marketplace.authservice.exception.EmailAlreadyExistsException;
import com.marketplace.authservice.exception.InvalidCredentialsException;
import com.marketplace.authservice.exception.UnauthorizedException;
import com.marketplace.authservice.repository.CredentialRepository;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final CredentialRepository credentialRepository;
    private final UserServiceClient userServiceClient;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            CredentialRepository credentialRepository,
            UserServiceClient userServiceClient,
            JwtService jwtService,
            PasswordEncoder passwordEncoder
    ) {
        this.credentialRepository = credentialRepository;
        this.userServiceClient = userServiceClient;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse signup(SignupRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new BadRequestException("Name is required");
        }
        if (request.email() == null || request.email().trim().isEmpty() || !request.email().contains("@")) {
            throw new BadRequestException("Valid email is required");
        }
        validatePassword(request.password());

        String email = request.email().trim().toLowerCase();

        // 1. Check credentials table first
        if (credentialRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        // 2. Call user-service to create profile
        UserDto createdUser = userServiceClient.createUser(
                request.name().trim(),
                email,
                request.city() != null ? request.city().trim() : null
        );

        // 3. Hash password and save credentials
        String passwordHash = passwordEncoder.encode(request.password());
        Credential credential = new Credential(
                createdUser.id(),
                email,
                passwordHash,
                "CUSTOMER"
        );

        try {
            credentialRepository.save(credential);
        } catch (Exception e) {
            log.error("CRITICAL: User profile created in user-service with ID {} but credentials failed to save in auth-service: {}",
                    createdUser.id(), e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save user credentials");
        }

        // 4. Generate JWT token
        String token = jwtService.generateToken(createdUser.id(), email, "CUSTOMER");
        return new AuthResponse(createdUser, "CUSTOMER", token, jwtService.getExpirySeconds());
    }

    public AuthResponse login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String email = request.email().trim().toLowerCase();
        Credential credential = credentialRepository.findByEmail(email).orElse(null);

        // Check user existence and verify BCrypt hash
        if (credential == null || !passwordEncoder.matches(request.password(), credential.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Update last_login_at
        credential.setLastLoginAt(LocalDateTime.now());
        credentialRepository.save(credential);

        // Fetch user profile from user-service
        UserDto user = userServiceClient.getUserById(credential.getUserId());
        if (user == null) {
            user = new UserDto(credential.getUserId(), "", credential.getEmail(), null);
        }

        String token = jwtService.generateToken(credential.getUserId(), credential.getEmail(), credential.getRole());
        return new AuthResponse(user, credential.getRole(), token, jwtService.getExpirySeconds());
    }

    public MeResponse me(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7).trim();
        Claims claims = jwtService.validateAndExtractClaims(token);

        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new UnauthorizedException("Invalid token subject");
        }

        String role = claims.get("role", String.class);
        if (role == null) {
            role = "CUSTOMER";
        }

        UserDto user = userServiceClient.getUserById(userId);
        if (user == null) {
            user = new UserDto(userId, "", claims.get("email", String.class), null);
        }

        return new MeResponse(user, role);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8 || !password.matches(".*[a-zA-Z].*") || !password.matches(".*\\d.*")) {
            throw new BadRequestException("Password must be at least 8 characters long and contain at least one letter and one digit");
        }
    }
}

