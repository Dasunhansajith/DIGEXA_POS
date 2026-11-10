package com.nexshop.service;

import com.nexshop.dto.LoginRequest;
import com.nexshop.dto.LoginResponse;
import com.nexshop.model.User;
import com.nexshop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class LoginService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Autowired
    public LoginService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse authenticate(LoginRequest request) {
        // 1. Normalize the login email using trim() and toLowerCase()
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (normalizedEmail.isEmpty() || request.getPassword() == null) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // 2. Find the user by email using UserRepository
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // 3. Verify the submitted password using passwordEncoder.matches()
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // 4. Retrieve shop ID from authenticated user's shop entity
        Long shopId = user.getShop() != null ? user.getShop().getId() : null;

        // 5. Generate JWT token only after successful password verification
        String accessToken = jwtService.generateToken(user.getId(), shopId, user.getEmail(), user.getRole());

        // 6. Return safe LoginResponse with user details and Bearer token
        return LoginResponse.builder()
                .userId(user.getId())
                .shopId(shopId)
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .message("Login successful")
                .accessToken(accessToken)
                .tokenType("Bearer")
                .build();
    }
}
