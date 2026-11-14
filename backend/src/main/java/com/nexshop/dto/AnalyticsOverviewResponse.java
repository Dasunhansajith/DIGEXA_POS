package com.nexshop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
public class AnalyticsOverviewResponse {

    private BigDecimal totalRevenue;
    private Long totalTransactions;
    private Long itemsSold;
    private BigDecimal averageTransactionValue;
    private String period;
    private String startDate;
    private String endDate;
}
