package com.nexshop.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    // 1 hour expiration in milliseconds (60 * 60 * 1000)
    private static final long EXPIRATION_TIME_MS = 3_600_000L;

    @Value("${jwt.secret}")
    private String jwtSecret;

    /**
     * Decode the Base64-encoded 256-bit secret and generate HMAC-SHA key.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(this.jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate a signed JWT access token for an authenticated user.
     * Subject: email
     * Claims: userId, shopId, role
     * Validity: 1 hour
     */
    public String generateToken(Long userId, Long shopId, String email, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION_TIME_MS);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .claim("shopId", shopId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Parse and extract all claims from token. Rejects invalid or expired tokens.
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extract subject (email) from token.
     */
    public String extractSubject(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Extract email (alias for subject).
     */
    public String extractEmail(String token) {
        return extractSubject(token);
    }

    /**
     * Extract userId claim from token.
     */
    public Long extractUserId(String token) {
        Object userId = extractAllClaims(token).get("userId");
        if (userId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    /**
     * Extract shopId claim from token.
     */
    public Long extractShopId(String token) {
        Object shopId = extractAllClaims(token).get("shopId");
        if (shopId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    /**
     * Extract role claim from token.
     */
    public String extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        return role != null ? role.toString() : null;
    }

    /**
     * Extract token expiration date.
     */
    public Date extractExpiration(String token) {
        return extractAllClaims(token).getExpiration();
    }

    /**
     * Validate token signature and check whether it is expired.
     */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration() != null && !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Validate token against an expected user email and expiration.
     */
    public boolean isTokenValid(String token, String expectedEmail) {
        try {
            Claims claims = extractAllClaims(token);
            boolean isEmailValid = expectedEmail != null && expectedEmail.equalsIgnoreCase(claims.getSubject());
            boolean isNotExpired = claims.getExpiration() != null && !claims.getExpiration().before(new Date());
            return isEmailValid && isNotExpired;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}

