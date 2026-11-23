package com.marketplace.authservice.dto;

public record LoginRequest(
    String email,
    String password
) {}

