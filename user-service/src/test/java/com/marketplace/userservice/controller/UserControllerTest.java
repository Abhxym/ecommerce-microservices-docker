package com.marketplace.userservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketplace.userservice.dto.CreateUserRequest;
import com.marketplace.userservice.entity.User;
import com.marketplace.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/users returns list of users")
    void testGetAllUsers() throws Exception {
        userRepository.save(new User("Priya Sharma", "priya.sharma@example.com", "Pune"));
        userRepository.save(new User("Rohan Patil", "rohan.patil@example.com", "Mumbai"));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name", is("Priya Sharma")))
                .andExpect(jsonPath("$[0].email", is("priya.sharma@example.com")))
                .andExpect(jsonPath("$[0].city", is("Pune")))
                .andExpect(jsonPath("$[1].name", is("Rohan Patil")));
    }

    @Test
    @DisplayName("GET /api/users/{id} returns user when exists")
    void testGetUserById_Success() throws Exception {
        User saved = userRepository.save(new User("Ananya Iyer", "ananya.iyer@example.com", "Bengaluru"));

        mockMvc.perform(get("/api/users/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(saved.getId().intValue())))
                .andExpect(jsonPath("$.name", is("Ananya Iyer")))
                .andExpect(jsonPath("$.email", is("ananya.iyer@example.com")))
                .andExpect(jsonPath("$.city", is("Bengaluru")));
    }

    @Test
    @DisplayName("GET /api/users/{id} returns 404 when user not found")
    void testGetUserById_NotFound() throws Exception {
        mockMvc.perform(get("/api/users/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/users creates user and returns 201")
    void testCreateUser_Success() throws Exception {
        CreateUserRequest request = new CreateUserRequest("Amit Kumar", "amit.kumar@example.com", "Delhi");

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name", is("Amit Kumar")))
                .andExpect(jsonPath("$.email", is("amit.kumar@example.com")))
                .andExpect(jsonPath("$.city", is("Delhi")));
    }

    @Test
    @DisplayName("POST /api/users returns 400 when name or email is blank")
    void testCreateUser_ValidationError() throws Exception {
        CreateUserRequest request = new CreateUserRequest("", "invalid-email", "Delhi");

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("Validation failed")))
                .andExpect(jsonPath("$.details").exists());
    }

    @Test
    @DisplayName("POST /api/users returns 409 when email already exists")
    void testCreateUser_DuplicateEmailConflict() throws Exception {
        userRepository.save(new User("Priya Sharma", "priya.sharma@example.com", "Pune"));

        CreateUserRequest request = new CreateUserRequest("Priya Duplicate", "priya.sharma@example.com", "Pune");

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("Email already exists")));
    }

    @Test
    @DisplayName("GET /actuator/health returns 200 and UP")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }
}

