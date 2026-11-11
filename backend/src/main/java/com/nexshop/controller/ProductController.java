package com.nexshop.controller;

import com.nexshop.dto.ProductRequest;
import com.nexshop.dto.ProductResponse;
import com.nexshop.model.User;
import com.nexshop.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    @Autowired
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * Derive the authenticated shop ID exclusively from the verified server-side
     * security principal. Never trust or accept a shopId provided by the client.
     */
    private Long getAuthenticatedShopId(Authentication authentication) {
        if (authentication == null) {
            authentication = SecurityContextHolder.getContext().getAuthentication();
        }
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        if (user.getShop() == null || user.getShop().getId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user is not associated with any shop");
        }
        return user.getShop().getId();
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        Long shopId = getAuthenticatedShopId(authentication);
        return ResponseEntity.ok(productService.searchAndFilterProducts(search, category, shopId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(
            @PathVariable Long id,
            Authentication authentication) {
        Long shopId = getAuthenticatedShopId(authentication);
        return productService.getProductById(id, shopId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {
        Long shopId = getAuthenticatedShopId(authentication);
        ProductResponse saved = productService.createProduct(request, shopId);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {
        Long shopId = getAuthenticatedShopId(authentication);
        return productService.updateProduct(id, request, shopId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id,
            Authentication authentication) {
        Long shopId = getAuthenticatedShopId(authentication);
        boolean deleted = productService.deleteProduct(id, shopId);
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
