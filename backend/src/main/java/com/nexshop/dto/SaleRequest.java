package com.nexshop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleRequest {

    @NotEmpty(message = "Sale must contain at least one item")
    private List<@Valid SaleItemRequest> items;

    private String customerName;
    private String customerPhone;
    private String paymentMethod; // "CASH", "CARD" (default "CASH")
    private String discountType; // "NONE", "PERCENT", "FIXED" (default "NONE")
    private BigDecimal discountValue;
    private BigDecimal amountTendered;
    private String notes;
    private String idempotencyKey;
}

