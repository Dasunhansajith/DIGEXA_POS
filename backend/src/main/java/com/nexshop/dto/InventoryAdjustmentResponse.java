package com.nexshop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.nexshop.model.InventoryAdjustment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryAdjustmentResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Long userId;
    private String userFullName;
    private Integer adjustmentQuantity;
    private Integer previousQuantity;
    private Integer newQuantity;
    private String reason;
    private String note;
    private String createdAt;

    public static InventoryAdjustmentResponse fromEntity(InventoryAdjustment adj) {
        if (adj == null) {
            return null;
        }
        return InventoryAdjustmentResponse.builder()
                .id(adj.getId())
                .productId(adj.getProduct() != null ? adj.getProduct().getId() : null)
                .productName(adj.getProduct() != null ? adj.getProduct().getName() : null)
                .userId(adj.getUser() != null ? adj.getUser().getId() : null)
                .userFullName(adj.getUser() != null ? adj.getUser().getFullName() : null)
                .adjustmentQuantity(adj.getAdjustmentQuantity())
                .previousQuantity(adj.getPreviousQuantity())
                .newQuantity(adj.getNewQuantity())
                .reason(adj.getReason())
                .note(adj.getNote())
                .createdAt(adj.getCreatedAt() != null ? adj.getCreatedAt().toString() : null)
                .build();
    }
}

