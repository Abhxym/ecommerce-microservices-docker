package com.marketplace.authservice.dto;

public record UserDto(
    Long id,
    String name,
    String email,
    String city
) {}

