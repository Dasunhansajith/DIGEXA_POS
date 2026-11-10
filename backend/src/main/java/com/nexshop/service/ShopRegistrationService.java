package com.nexshop.service;

import com.nexshop.dto.ShopRegistrationRequest;
import com.nexshop.dto.ShopRegistrationResponse;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.ShopRepository;
import com.nexshop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShopRegistrationService {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public ShopRegistrationService(
            ShopRepository shopRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ShopRegistrationResponse registerShop(ShopRegistrationRequest request) {
        // 1. Validate that password and confirmPassword match
        if (request.getPassword() == null || !request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // 2. Normalize email to lowercase and trim whitespace
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (normalizedEmail.isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        // 3. Check whether the email already exists in either repository
        if (shopRepository.existsByEmail(normalizedEmail) || userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        // 4. Create and save Shop with plan "FREE"
        Shop shop = new Shop();
        shop.setName(request.getShopName() != null ? request.getShopName().trim() : "");
        shop.setEmail(normalizedEmail);
        shop.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        shop.setPlan("FREE");

        Shop savedShop = shopRepository.save(shop);

        // 5. Hash password and create the shop owner as a User with role "OWNER"
        User owner = new User();
        owner.setFullName(request.getOwnerFullName() != null ? request.getOwnerFullName().trim() : "");
        owner.setEmail(normalizedEmail);
        owner.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        owner.setRole("OWNER");
        owner.setShop(savedShop);

        User savedOwner = userRepository.save(owner);

        // 6. Return safe response containing shop ID, owner ID, and success message (no password hashes)
        return ShopRegistrationResponse.builder()
                .shopId(savedShop.getId())
                .ownerId(savedOwner.getId())
                .shopName(savedShop.getName())
                .email(savedOwner.getEmail())
                .message("Shop and owner account created successfully")
                .build();
    }
}

