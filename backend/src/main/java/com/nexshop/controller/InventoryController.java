package com.nexshop.controller;

import com.nexshop.dto.InventoryAdjustmentResponse;
import com.nexshop.dto.InventoryOverviewResponse;
import com.nexshop.dto.InventoryProductResponse;
import com.nexshop.dto.StockAdjustmentRequest;
import com.nexshop.dto.UpdateThresholdRequest;
import com.nexshop.model.User;
import com.nexshop.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping({"/api/inventory", "/api/inventory/"})
public class InventoryController {

    private final InventoryService inventoryService;

    @Autowired
    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * Derive the authenticated user principal exclusively from the verified server-side
     * security context. Never trust or accept a shopId or userId from client parameters.
     */
    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null) {
            authentication = SecurityContextHolder.getContext().getAuthentication();
        }
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        if (user.getShop() == null || user.getShop().getId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user is not associated with any shop");
        }
        return user;
    }

    @GetMapping("/overview")
    public ResponseEntity<InventoryOverviewResponse> getOverview(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(inventoryService.getOverview(user.getShop().getId()));
    }

    @GetMapping("/products")
    public ResponseEntity<List<InventoryProductResponse>> getProducts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(inventoryService.getProducts(user.getShop().getId(), status, query, category));
    }

    @PatchMapping("/products/{productId}/stock")
    public ResponseEntity<InventoryProductResponse> adjustStock(
            @PathVariable Long productId,
            @Valid @RequestBody StockAdjustmentRequest request,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(inventoryService.adjustStock(user.getShop().getId(), productId, request, user));
    }

    @PatchMapping("/products/{productId}/threshold")
    public ResponseEntity<InventoryProductResponse> updateThreshold(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateThresholdRequest request,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(inventoryService.updateThreshold(user.getShop().getId(), productId, request));
    }

    @GetMapping("/adjustments")
    public ResponseEntity<List<InventoryAdjustmentResponse>> getAdjustments(
            @RequestParam(required = false) Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(inventoryService.getAdjustments(user.getShop().getId(), productId, page, size));
    }
}

