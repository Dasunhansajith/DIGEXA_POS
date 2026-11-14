package com.nexshop.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateThresholdRequest {

    @NotNull(message = "lowStockThreshold is required")
    @Min(value = 0, message = "lowStockThreshold must be greater than or equal to 0")
    private Integer lowStockThreshold;
}

