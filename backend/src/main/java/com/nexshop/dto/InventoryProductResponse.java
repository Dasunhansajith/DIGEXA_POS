package com.nexshop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.nexshop.model.InventoryStatus;
import com.nexshop.model.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryProductResponse {

    private Long productId;
    private String productName;
    private String category;
    private Integer stockQuantity;
    private Integer lowStockThreshold;
    private InventoryStatus inventoryStatus;
    private BigDecimal sellingPrice;

    public static InventoryProductResponse fromEntity(Product product) {
        if (product == null) {
            return null;
        }
        int stock = product.getStock() != null ? product.getStock() : 0;
        int threshold = product.getLowStockThreshold() != null ? product.getLowStockThreshold() : 5;

        return InventoryProductResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .category(product.getCategory())
                .stockQuantity(stock)
                .lowStockThreshold(threshold)
                .inventoryStatus(InventoryStatus.fromStockAndThreshold(stock, threshold))
                .sellingPrice(product.getPrice())
                .build();
    }
}

