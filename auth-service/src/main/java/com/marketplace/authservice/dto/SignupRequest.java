package com.marketplace.authservice.dto;

public record SignupRequest(
    String name,
    String email,
    String city,
    String password
) {}

