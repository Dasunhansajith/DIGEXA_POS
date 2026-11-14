package com.nexshop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class SaleResponse {

    private Long id;
    private String receiptNumber;
    private String idempotencyKey;
    private Long shopId;
    private Long cashierId;
    private String cashierName;
    private String customerName;
    private String customerPhone;
    private String status;
    private String paymentMethod;
    private BigDecimal subtotal;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal amountTendered;
    private BigDecimal changeAmount;
    private String notes;
    private String createdAt;
    private Integer itemCount;
    private List<SaleItemResponse> items;
}

