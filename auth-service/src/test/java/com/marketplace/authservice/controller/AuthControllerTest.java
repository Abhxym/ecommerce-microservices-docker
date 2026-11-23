package com.marketplace.authservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketplace.authservice.client.UserServiceClient;
import com.marketplace.authservice.dto.LoginRequest;
import com.marketplace.authservice.dto.SignupRequest;
import com.marketplace.authservice.dto.UserDto;
import com.marketplace.authservice.entity.Credential;
import com.marketplace.authservice.repository.CredentialRepository;
import com.marketplace.authservice.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CredentialRepository credentialRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserServiceClient userServiceClient;

    @BeforeEach
    void setUp() {
        credentialRepository.deleteAll();
    }

    @Test
    @DisplayName("signup with valid data: 201, token present, password hash stored, not password")
    void testSignup_Success() throws Exception {
        UserDto mockCreatedUser = new UserDto(6L, "Neha Kulkarni", "neha.k@example.com", "Nashik");
        when(userServiceClient.createUser("Neha Kulkarni", "neha.k@example.com", "Nashik"))
                .thenReturn(mockCreatedUser);

        SignupRequest request = new SignupRequest("Neha Kulkarni", "neha.k@example.com", "Nashik", "Shop2026pass");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.id", is(6)))
                .andExpect(jsonPath("$.user.name", is("Neha Kulkarni")))
                .andExpect(jsonPath("$.user.email", is("neha.k@example.com")))
                .andExpect(jsonPath("$.role", is("CUSTOMER")))
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.expiresIn", is(3600)));

        // Verify password hash in DB
        Credential savedCred = credentialRepository.findByEmail("neha.k@example.com").orElse(null);
        assertNotNull(savedCred);
        assertEquals(6L, savedCred.getUserId());
        assertNotEquals("Shop2026pass", savedCred.getPasswordHash());
        assertTrue(passwordEncoder.matches("Shop2026pass", savedCred.getPasswordHash()));
        assertTrue(savedCred.getPasswordHash().startsWith("$2a$") || savedCred.getPasswordHash().startsWith("$2b$"));
    }

    @Test
    @DisplayName("signup with an existing email: 409")
    void testSignup_ExistingEmail() throws Exception {
        credentialRepository.save(new Credential(1L, "existing@example.com", passwordEncoder.encode("Secret123"), "CUSTOMER"));

        SignupRequest request = new SignupRequest("Another Name", "existing@example.com", "Pune", "Secret123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("Email already exists")));
    }

    @Test
    @DisplayName("signup with a weak password ('abc'): 400")
    void testSignup_WeakPassword() throws Exception {
        SignupRequest request = new SignupRequest("Neha Kulkarni", "neha.k@example.com", "Nashik", "abc");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Password must be at least 8 characters")));
    }

    @Test
    @DisplayName("login with the right password: 200, token present, last_login_at set")
    void testLogin_Success() throws Exception {
        credentialRepository.save(new Credential(6L, "neha.k@example.com", passwordEncoder.encode("Shop2026pass"), "CUSTOMER"));
        when(userServiceClient.getUserById(6L))
                .thenReturn(new UserDto(6L, "Neha Kulkarni", "neha.k@example.com", "Nashik"));

        LoginRequest request = new LoginRequest("neha.k@example.com", "Shop2026pass");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id", is(6)))
                .andExpect(jsonPath("$.role", is("CUSTOMER")))
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.expiresIn", is(3600)));

        Credential credAfter = credentialRepository.findByEmail("neha.k@example.com").orElseThrow();
        assertNotNull(credAfter.getLastLoginAt());
    }

    @Test
    @DisplayName("login with a wrong password: 401 with generic message")
    void testLogin_WrongPassword() throws Exception {
        credentialRepository.save(new Credential(6L, "neha.k@example.com", passwordEncoder.encode("Shop2026pass"), "CUSTOMER"));

        LoginRequest request = new LoginRequest("neha.k@example.com", "wrongpassword1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Invalid email or password")));
    }

    @Test
    @DisplayName("login with an unknown email: 401 with same generic message")
    void testLogin_UnknownEmail() throws Exception {
        LoginRequest request = new LoginRequest("unknown@example.com", "Shop2026pass");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Invalid email or password")));
    }

    @Test
    @DisplayName("/me with a valid token: 200, right user and role")
    void testMe_ValidToken() throws Exception {
        when(userServiceClient.getUserById(6L))
                .thenReturn(new UserDto(6L, "Neha Kulkarni", "neha.k@example.com", "Nashik"));

        String token = jwtService.generateToken(6L, "neha.k@example.com", "CUSTOMER");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id", is(6)))
                .andExpect(jsonPath("$.user.name", is("Neha Kulkarni")))
                .andExpect(jsonPath("$.role", is("CUSTOMER")));
    }

    @Test
    @DisplayName("/me without a token: 401")
    void testMe_WithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", containsString("Authorization header")));
    }

    @Test
    @DisplayName("/me with an expired or tampered token: 401")
    void testMe_TamperedToken() throws Exception {
        String token = jwtService.generateToken(6L, "neha.k@example.com", "CUSTOMER");
        String tampered = token + "badsignature";

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Invalid or expired token")));
    }

    @Test
    @DisplayName("GET /actuator/health returns UP")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }
}

