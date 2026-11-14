package com.nexshop.controller;

import com.nexshop.dto.PageResponse;
import com.nexshop.dto.SaleRequest;
import com.nexshop.dto.SaleResponse;
import com.nexshop.dto.SalesSummaryResponse;
import com.nexshop.model.User;
import com.nexshop.service.SaleService;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping({"/api/sales", "/api/sales/"})
public class SaleController {

    private final SaleService saleService;

    @Autowired
    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    /**
     * Derive the authenticated user principal exclusively from the verified server-side
     * security context. Never trust or accept a shopId or cashierId from client request body.
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

    @PostMapping({"", "/"})
    public ResponseEntity<SaleResponse> createSale(
            @Valid @RequestBody SaleRequest request,
            Authentication authentication) {
        User cashier = getAuthenticatedUser(authentication);
        Long shopId = cashier.getShop().getId();
        SaleResponse response = saleService.createSale(request, shopId, cashier);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * GET /api/sales
     * Supports pagination, search, date filtering (Asia/Colombo), payment method, status, and sorting.
     * When pagination or filter parameters are supplied, returns PageResponse with metadata.
     * When called with no parameters, returns List<SaleResponse> for backwards compatibility.
     */
    @GetMapping({"", "/"})
    public ResponseEntity<?> getSales(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            HttpServletRequest httpRequest,
            Authentication authentication) {
        User cashier = getAuthenticatedUser(authentication);
        Long shopId = cashier.getShop().getId();

        boolean hasParams = httpRequest != null && !httpRequest.getParameterMap().isEmpty();

        if (hasParams) {
            PageResponse<SaleResponse> paged = saleService.getSalesPaged(
                    shopId, query, startDate, endDate, paymentMethod, status, page, size, sortBy, sortDir
            );
            return ResponseEntity.ok(paged);
        }

        List<SaleResponse> allSales = saleService.getAllSales(shopId);
        return ResponseEntity.ok(allSales);
    }

    /**
     * GET /api/sales/summary
     * Computes totalSales, totalRevenue, and averageSale for filtered COMPLETED sales.
     */
    @GetMapping("/summary")
    public ResponseEntity<SalesSummaryResponse> getSalesSummary(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String status,
            Authentication authentication) {
        User cashier = getAuthenticatedUser(authentication);
        Long shopId = cashier.getShop().getId();

        SalesSummaryResponse summary = saleService.getSalesSummary(
                shopId, query, startDate, endDate, paymentMethod, status
        );
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/sales/{id}
     * Returns full receipt/sale details including line items, scoped strictly to the authenticated shop.
     * Numeric regex constraint ([0-9]+) prevents collisions with sub-resource routes like /api/sales/summary.
     * Cross-tenant access returns 404 rather than leaking existence.
     */
    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<SaleResponse> getSaleById(
            @PathVariable Long id,
            Authentication authentication) {
        User cashier = getAuthenticatedUser(authentication);
        Long shopId = cashier.getShop().getId();
        return saleService.getSaleById(id, shopId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
