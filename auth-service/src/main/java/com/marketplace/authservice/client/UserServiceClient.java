package com.marketplace.authservice.client;

import com.marketplace.authservice.dto.UserDto;
import com.marketplace.authservice.exception.BadRequestException;
import com.marketplace.authservice.exception.EmailAlreadyExistsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);
    private final RestClient restClient;

    public UserServiceClient(@Value("${user-service.url:http://user-service:8081}") String userServiceUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(3));

        this.restClient = RestClient.builder()
                .baseUrl(userServiceUrl)
                .requestFactory(factory)
                .build();
    }

    public UserDto createUser(String name, String email, String city) {
        Map<String, String> body = Map.of(
                "name", name,
                "email", email,
                "city", city != null ? city : ""
        );

        try {
            return restClient.post()
                    .uri("/api/users")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(UserDto.class);
        } catch (HttpClientErrorException.Conflict ex) {
            log.warn("user-service returned 409 conflict for email {}", email);
            throw new EmailAlreadyExistsException("Email already exists");
        } catch (HttpClientErrorException.BadRequest ex) {
            log.warn("user-service returned 400 bad request: {}", ex.getResponseBodyAsString());
            throw new BadRequestException("Invalid user details: " + ex.getStatusText());
        } catch (Exception ex) {
            log.error("Failed to call user-service POST /api/users: {}", ex.getMessage());
            throw ex;
        }
    }

    public UserDto getUserById(Long id) {
        try {
            return restClient.get()
                    .uri("/api/users/{id}", id)
                    .retrieve()
                    .body(UserDto.class);
        } catch (HttpClientErrorException.NotFound ex) {
            log.warn("user-service returned 404 for user id {}", id);
            return null;
        } catch (Exception ex) {
            log.error("Failed to call user-service GET /api/users/{}: {}", id, ex.getMessage());
            throw ex;
        }
    }
}

