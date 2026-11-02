package com.marketplace.userservice.dto;

import com.marketplace.userservice.entity.User;

public record UserResponse(
    Long id,
    String name,
    String email,
    String city
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getCity()
        );
    }
}

