package com.marketplace.authservice.service;

import com.marketplace.authservice.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-at-least-32-characters-long-123456";
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, 3600);
        jwtService.init();
    }

    @Test
    @DisplayName("JwtService: token has sub, email, role, iss")
    void testTokenHasRequiredClaims() {
        String token = jwtService.generateToken(10L, "test@example.com", "CUSTOMER");
        assertNotNull(token);

        Claims claims = jwtService.validateAndExtractClaims(token);
        assertEquals("10", claims.getSubject());
        assertEquals("test@example.com", claims.get("email"));
        assertEquals("CUSTOMER", claims.get("role"));
        assertEquals("shopease-auth", claims.getIssuer());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
    }

    @Test
    @DisplayName("JwtService: validation fails on tampered token")
    void testTamperedTokenFails() {
        String token = jwtService.generateToken(10L, "test@example.com", "CUSTOMER");
        String tamperedToken = token + "xyz";

        assertThrows(UnauthorizedException.class, () -> jwtService.validateAndExtractClaims(tamperedToken));
    }

    @Test
    @DisplayName("JwtService: validation fails on expired token")
    void testExpiredTokenFails() {
        JwtService shortLivedJwtService = new JwtService(SECRET, -10);
        shortLivedJwtService.init();

        String expiredToken = shortLivedJwtService.generateToken(10L, "test@example.com", "CUSTOMER");
        assertThrows(UnauthorizedException.class, () -> jwtService.validateAndExtractClaims(expiredToken));
    }

    @Test
    @DisplayName("JwtService: validation fails on wrong issuer")
    void testWrongIssuerFails() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String wrongIssuerToken = Jwts.builder()
                .issuer("untrusted-issuer")
                .subject("10")
                .signWith(key, Jwts.SIG.HS256)
                .compact();

        assertThrows(UnauthorizedException.class, () -> jwtService.validateAndExtractClaims(wrongIssuerToken));
    }

    @Test
    @DisplayName("JwtService: fails init when secret is shorter than 32 characters")
    void testSecretTooShortFails() {
        JwtService badService = new JwtService("short-secret", 3600);
        assertThrows(IllegalStateException.class, badService::init);
    }
}

