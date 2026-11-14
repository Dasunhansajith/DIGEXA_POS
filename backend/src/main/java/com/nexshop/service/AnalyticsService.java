package com.nexshop.service;

import com.nexshop.dto.AnalyticsOverviewResponse;
import com.nexshop.dto.DailyRevenueTrend;
import com.nexshop.dto.TopProductResponse;
import com.nexshop.model.Sale;
import com.nexshop.model.SaleItem;
import com.nexshop.repository.SaleItemRepository;
import com.nexshop.repository.SaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    /**
     * Documented shop-local timezone for date boundaries.
     * Sri Lanka Standard Time (Asia/Colombo, UTC+05:30) is the default operational timezone for DIGEXA / NEXSHOP.
     */
    public static final ZoneId SHOP_TIMEZONE = ZoneId.of("Asia/Colombo");

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;

    @Autowired
    public AnalyticsService(SaleRepository saleRepository, SaleItemRepository saleItemRepository) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
    }

    public record DateRange(
            LocalDate startDate,
            LocalDate endDate,
            LocalDateTime startDateTime,
            LocalDateTime endDateTimeExclusive,
            String periodLabel
    ) {}

    /**
     * Resolves the requested date range into concrete LocalDate and LocalDateTime boundaries
     * based on the shop's documented timezone.
     */
    public DateRange resolveDateRange(String period, LocalDate customStartDate, LocalDate customEndDate) {
        LocalDate today = LocalDate.now(SHOP_TIMEZONE);

        if (customStartDate != null || customEndDate != null || (period != null && period.equalsIgnoreCase("custom"))) {
            LocalDate start = customStartDate != null ? customStartDate : (customEndDate != null ? customEndDate.minusDays(29) : today.minusDays(29));
            LocalDate end = customEndDate != null ? customEndDate : today;

            if (start.isAfter(end)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate cannot be after endDate");
            }
            return new DateRange(
                    start,
                    end,
                    start.atStartOfDay(),
                    end.plusDays(1).atStartOfDay(),
                    "custom"
            );
        }

        String normalized = period != null ? period.trim().toLowerCase() : "last30days";
        LocalDate start;
        LocalDate end = today;
        String label;

        switch (normalized) {
            case "today":
                start = today;
                label = "today";
                break;
            case "yesterday":
                start = today.minusDays(1);
                end = today.minusDays(1);
                label = "yesterday";
                break;
            case "last7days":
            case "7days":
            case "7d":
            case "last_7_days":
                start = today.minusDays(6);
                label = "last7days";
                break;
            case "this_month":
            case "month":
                start = today.withDayOfMonth(1);
                label = "this_month";
                break;
            case "last30days":
            case "30days":
            case "30d":
            case "last_30_days":
            default:
                start = today.minusDays(29);
                label = "last30days";
                break;
        }

        return new DateRange(
                start,
                end,
                start.atStartOfDay(),
                end.plusDays(1).atStartOfDay(),
                label
        );
    }

    /**
     * Aggregates overview metrics: Total revenue, Total transactions, Items sold, and Average transaction value.
     */
    public AnalyticsOverviewResponse getOverview(Long shopId, String period, LocalDate customStartDate, LocalDate customEndDate) {
        DateRange range = resolveDateRange(period, customStartDate, customEndDate);

        BigDecimal totalRevenue = saleRepository.calculateTotalRevenue(
                shopId,
                range.startDateTime(),
                range.endDateTimeExclusive()
        );
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }
        totalRevenue = totalRevenue.setScale(2, RoundingMode.HALF_UP);

        Long totalTransactions = saleRepository.countCompletedSales(
                shopId,
                range.startDateTime(),
                range.endDateTimeExclusive()
        );
        if (totalTransactions == null) {
            totalTransactions = 0L;
        }

        Long itemsSold = saleItemRepository.sumSoldQuantities(
                shopId,
                range.startDateTime(),
                range.endDateTimeExclusive()
        );
        if (itemsSold == null) {
            itemsSold = 0L;
        }

        BigDecimal averageTransactionValue = totalTransactions > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalTransactions), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return AnalyticsOverviewResponse.builder()
                .totalRevenue(totalRevenue)
                .totalTransactions(totalTransactions)
                .itemsSold(itemsSold)
                .averageTransactionValue(averageTransactionValue)
                .period(range.periodLabel())
                .startDate(range.startDate().toString())
                .endDate(range.endDate().toString())
                .build();
    }

    /**
     * Calculates daily sales trend data across the requested date range, filling any gap days with zero.
     */
    public List<DailyRevenueTrend> getRevenueTrend(Long shopId, String period, LocalDate customStartDate, LocalDate customEndDate) {
        DateRange range = resolveDateRange(period, customStartDate, customEndDate);

        List<Sale> sales = saleRepository.findCompletedSalesWithItemsInRange(
                shopId,
                range.startDateTime(),
                range.endDateTimeExclusive()
        );

        Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
        Map<LocalDate, Long> countMap = new HashMap<>();
        Map<LocalDate, Long> itemsMap = new HashMap<>();

        for (Sale sale : sales) {
            LocalDate saleDate = sale.getCreatedAt() != null
                    ? sale.getCreatedAt().toLocalDate()
                    : range.startDate();

            revenueMap.merge(saleDate, sale.getTotalAmount() != null ? sale.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
            countMap.merge(saleDate, 1L, Long::sum);

            long itemsInSale = 0L;
            if (sale.getItems() != null) {
                for (SaleItem item : sale.getItems()) {
                    if (item.getQuantity() != null) {
                        itemsInSale += item.getQuantity();
                    }
                }
            }
            itemsMap.merge(saleDate, itemsInSale, Long::sum);
        }

        List<DailyRevenueTrend> result = new ArrayList<>();
        for (LocalDate d = range.startDate(); !d.isAfter(range.endDate()); d = d.plusDays(1)) {
            BigDecimal rev = revenueMap.getOrDefault(d, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            Long count = countMap.getOrDefault(d, 0L);
            Long sold = itemsMap.getOrDefault(d, 0L);

            result.add(DailyRevenueTrend.builder()
                    .date(d.toString())
                    .revenue(rev)
                    .transactionCount(count)
                    .itemsSold(sold)
                    .build());
        }

        return result;
    }

    /**
     * Aggregates the top best-selling products by quantity and revenue within the requested range.
     */
    public List<TopProductResponse> getTopProducts(Long shopId, String period, LocalDate customStartDate, LocalDate customEndDate, Integer limit) {
        DateRange range = resolveDateRange(period, customStartDate, customEndDate);
        int safeLimit = Math.max(1, Math.min(limit != null ? limit : 5, 50));

        List<SaleItem> items = saleItemRepository.findSaleItemsInRange(
                shopId,
                range.startDateTime(),
                range.endDateTimeExclusive()
        );

        if (items.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, ProductAccumulator> accumulatorMap = new LinkedHashMap<>();

        for (SaleItem item : items) {
            Long prodId = item.getProduct() != null ? item.getProduct().getId() : null;
            String name = item.getProductName() != null ? item.getProductName() : "Unknown Product";
            String category = (item.getProduct() != null && item.getProduct().getCategory() != null)
                    ? item.getProduct().getCategory()
                    : "Uncategorized";

            String key = (prodId != null ? prodId.toString() : "PROD") + "::" + name;

            ProductAccumulator acc = accumulatorMap.computeIfAbsent(
                    key,
                    k -> new ProductAccumulator(prodId, name, category)
            );

            acc.quantitySold += (item.getQuantity() != null ? item.getQuantity() : 0);
            if (item.getSubtotal() != null) {
                acc.totalRevenue = acc.totalRevenue.add(item.getSubtotal());
            }
        }

        return accumulatorMap.values().stream()
                .sorted(Comparator.comparing(ProductAccumulator::getQuantitySold).reversed()
                        .thenComparing(Comparator.comparing(ProductAccumulator::getTotalRevenue).reversed()))
                .limit(safeLimit)
                .map(acc -> TopProductResponse.builder()
                        .productId(acc.productId)
                        .productName(acc.productName)
                        .category(acc.category)
                        .quantitySold(acc.quantitySold)
                        .totalRevenue(acc.totalRevenue.setScale(2, RoundingMode.HALF_UP))
                        .build())
                .toList();
    }

    private static class ProductAccumulator {
        private final Long productId;
        private final String productName;
        private final String category;
        private long quantitySold = 0L;
        private BigDecimal totalRevenue = BigDecimal.ZERO;

        public ProductAccumulator(Long productId, String productName, String category) {
            this.productId = productId;
            this.productName = productName;
            this.category = category;
        }

        public long getQuantitySold() {
            return quantitySold;
        }

        public BigDecimal getTotalRevenue() {
            return totalRevenue;
        }
    }
}

