package com.nexshop.controller;

import com.nexshop.dto.LoginRequest;
import com.nexshop.dto.LoginResponse;
import com.nexshop.dto.ShopRegistrationRequest;
import com.nexshop.dto.ShopRegistrationResponse;
import com.nexshop.service.LoginService;
import com.nexshop.service.ShopRegistrationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class ShopRegistrationController {

    private final ShopRegistrationService shopRegistrationService;
    private final LoginService loginService;

    @Autowired
    public ShopRegistrationController(
            ShopRegistrationService shopRegistrationService,
            LoginService loginService) {
        this.shopRegistrationService = shopRegistrationService;
        this.loginService = loginService;
    }

    @PostMapping("/register")
    public ResponseEntity<ShopRegistrationResponse> register(
            @Valid @RequestBody ShopRegistrationRequest request) {
        ShopRegistrationResponse response = shopRegistrationService.registerShop(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = loginService.authenticate(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(
            IllegalArgumentException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
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
