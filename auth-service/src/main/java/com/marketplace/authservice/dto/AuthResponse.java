package com.marketplace.authservice.dto;

public record AuthResponse(
    UserDto user,
    String role,
    String token,
    long expiresIn
) {}

