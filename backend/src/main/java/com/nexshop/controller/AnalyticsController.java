package com.nexshop.controller;

import com.nexshop.dto.AnalyticsOverviewResponse;
import com.nexshop.dto.DailyRevenueTrend;
import com.nexshop.dto.TopProductResponse;
import com.nexshop.model.User;
import com.nexshop.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/analytics", "/api/analytics/"})
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Autowired
    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Derive the authenticated user principal exclusively from the verified server-side
     * security context. Never trust or accept a shopId from client parameters.
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

    /**
     * GET /api/analytics/overview
     * Returns total revenue, total transactions, items sold, and average transaction value.
     */
    @GetMapping({"/overview", "/overview/"})
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication
    ) {
        User user = getAuthenticatedUser(authentication);
        Long shopId = user.getShop().getId();
        AnalyticsOverviewResponse response = analyticsService.getOverview(shopId, period, startDate, endDate);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/analytics/revenue-trend
     * Returns daily sales chart data for continuous visualization across the date range.
     */
    @GetMapping({"/revenue-trend", "/revenue-trend/"})
    public ResponseEntity<List<DailyRevenueTrend>> getRevenueTrend(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication
    ) {
        User user = getAuthenticatedUser(authentication);
        Long shopId = user.getShop().getId();
        List<DailyRevenueTrend> response = analyticsService.getRevenueTrend(shopId, period, startDate, endDate);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/analytics/top-products
     * Returns best-selling products by quantity and revenue.
     */
    @GetMapping({"/top-products", "/top-products/"})
    public ResponseEntity<List<TopProductResponse>> getTopProducts(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "5") Integer limit,
            Authentication authentication
    ) {
        User user = getAuthenticatedUser(authentication);
        Long shopId = user.getShop().getId();
        List<TopProductResponse> response = analyticsService.getTopProducts(shopId, period, startDate, endDate, limit);
        return ResponseEntity.ok(response);
    }
}

