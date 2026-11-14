package com.nexshop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryOverviewResponse {

    private Long totalProducts;
    private Long totalUnitsInStock;
    private Long inStockProducts;
    private Long lowStockProducts;
    private Long outOfStockProducts;
}

