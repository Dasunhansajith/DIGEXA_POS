package com.nexshop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustmentRequest {

    @NotNull(message = "Adjustment quantity cannot be null")
    private Integer adjustment;

    @NotBlank(message = "Adjustment reason is required")
    private String reason;

    @Size(max = 500, message = "Note cannot exceed 500 characters")
    private String note;
}

