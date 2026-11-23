package com.marketplace.authservice.dto;

public record MeResponse(
    UserDto user,
    String role
) {}

