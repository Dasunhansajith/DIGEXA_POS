package com.nexshop.service;

import com.nexshop.dto.*;
import com.nexshop.model.*;
import com.nexshop.repository.ProductRepository;
import com.nexshop.repository.SaleRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SaleService {

    public static final ZoneId SHOP_TIMEZONE = ZoneId.of("Asia/Colombo");

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    @Autowired
    public SaleService(SaleRepository saleRepository, ProductRepository productRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
    }

    /**
     * Process checkout sale with atomic stock deduction, pessimistic locking,
     * BigDecimal recalculations, and shop-scoped idempotency.
     */
    @Transactional
    public SaleResponse createSale(SaleRequest request, Long shopId, User cashier) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale must contain at least one item");
        }

        String idempotencyKey = request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()
                ? request.getIdempotencyKey().trim()
                : null;

        // 1. Check shop-scoped idempotency
        if (idempotencyKey != null) {
            Optional<Sale> existingOpt = saleRepository.findByShop_IdAndIdempotencyKey(shopId, idempotencyKey);
            if (existingOpt.isPresent()) {
                Sale existingSale = existingOpt.get();
                verifyPayloadMatch(request, existingSale);
                log.info("Idempotent request detected. Returning existing sale id={} for key={}", existingSale.getId(), idempotencyKey);
                return mapToSaleResponse(existingSale);
            }
        }

        // 2. Validate discount configuration
        String discountType = request.getDiscountType() != null && !request.getDiscountType().isBlank()
                ? request.getDiscountType().trim().toUpperCase(Locale.ROOT)
                : "NONE";

        if (!List.of("NONE", "PERCENT", "FIXED").contains(discountType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid discount type: " + discountType + ". Allowed: NONE, PERCENT, FIXED");
        }

        BigDecimal discountValue = request.getDiscountValue() != null
                ? request.getDiscountValue().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (discountValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discount value cannot be negative");
        }

        if ("PERCENT".equals(discountType) && discountValue.compareTo(new BigDecimal("100.00")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discount percentage cannot exceed 100%");
        }

        // 3. Validate payment method
        String paymentMethod = request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()
                ? request.getPaymentMethod().trim().toUpperCase(Locale.ROOT)
                : "CASH";

        if (!List.of("CASH", "CARD").contains(paymentMethod)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment method: " + paymentMethod + ". Allowed: CASH, CARD");
        }

        // 4. Consolidate requested quantities by product ID and sort product IDs to prevent deadlocks
        Map<Long, Integer> consolidatedQuantities = new LinkedHashMap<>();
        for (SaleItemRequest itemReq : request.getItems()) {
            if (itemReq.getProductId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID cannot be null");
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero for product ID: " + itemReq.getProductId());
            }
            consolidatedQuantities.merge(itemReq.getProductId(), itemReq.getQuantity(), Integer::sum);
        }

        List<Long> sortedProductIds = new ArrayList<>(consolidatedQuantities.keySet());
        Collections.sort(sortedProductIds);

        // 5. Acquire pessimistic write locks in order and deduct stock atomically
        Map<Long, Product> lockedProducts = new HashMap<>();
        for (Long productId : sortedProductIds) {
            Product product = productRepository.findByIdAndShop_IdForUpdate(productId, shopId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Product not found or does not belong to your shop: ID " + productId));

            int requestedQty = consolidatedQuantities.get(productId);
            if (product.getStock() == null || product.getStock() < requestedQty) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product '" + product.getName() + "'. Available: "
                                + (product.getStock() == null ? 0 : product.getStock()) + ", requested: " + requestedQty);
            }

            // Deduct stock
            product.setStock(product.getStock() - requestedQty);
            productRepository.save(product);
            lockedProducts.put(productId, product);
        }

        // 6. Recalculate financial totals using stored product prices and BigDecimal
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        List<SaleItem> saleItems = new ArrayList<>();

        for (SaleItemRequest itemReq : request.getItems()) {
            Product product = lockedProducts.get(itemReq.getProductId());
            BigDecimal unitPrice = product.getPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemSubtotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            subtotal = subtotal.add(itemSubtotal);

            SaleItem saleItem = SaleItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .unitPrice(unitPrice)
                    .quantity(itemReq.getQuantity())
                    .subtotal(itemSubtotal)
                    .build();

            saleItems.add(saleItem);
        }

        // 7. Calculate discount amount
        BigDecimal discountAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if ("PERCENT".equals(discountType)) {
            discountAmount = subtotal.multiply(discountValue)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else if ("FIXED".equals(discountType)) {
            discountAmount = discountValue.setScale(2, RoundingMode.HALF_UP);
            if (discountAmount.compareTo(subtotal) > 0) {
                discountAmount = subtotal;
            }
        }

        BigDecimal taxAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.subtract(discountAmount).add(taxAmount).setScale(2, RoundingMode.HALF_UP);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        // 8. Validate payments
        BigDecimal amountTendered;
        BigDecimal changeAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if ("CASH".equals(paymentMethod)) {
            if (request.getAmountTendered() != null) {
                amountTendered = request.getAmountTendered().setScale(2, RoundingMode.HALF_UP);
                if (amountTendered.compareTo(totalAmount) < 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Amount tendered (" + amountTendered + ") is less than total amount (" + totalAmount + ")");
                }
                changeAmount = amountTendered.subtract(totalAmount).setScale(2, RoundingMode.HALF_UP);
            } else {
                amountTendered = totalAmount;
            }
        } else {
            // CARD payment: record-only
            amountTendered = totalAmount;
            changeAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        // 9. Generate collision-resistant unique receipt number
        String receiptNumber = generateUniqueReceiptNumber();

        // 10. Build and persist Sale entity
        Sale sale = Sale.builder()
                .receiptNumber(receiptNumber)
                .idempotencyKey(idempotencyKey)
                .shop(cashier.getShop())
                .cashier(cashier)
                .customerName(request.getCustomerName() != null ? request.getCustomerName().trim() : null)
                .customerPhone(request.getCustomerPhone() != null ? request.getCustomerPhone().trim() : null)
                .status("COMPLETED")
                .paymentMethod(paymentMethod)
                .subtotal(subtotal)
                .discountType(discountType)
                .discountValue(discountValue)
                .discountAmount(discountAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .amountTendered(amountTendered)
                .changeAmount(changeAmount)
                .notes(request.getNotes() != null ? request.getNotes().trim() : null)
                .build();

        for (SaleItem item : saleItems) {
            sale.addItem(item);
        }

        try {
            Sale saved = saleRepository.save(sale);
            return mapToSaleResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            // Handle concurrent idempotent requests with the same key
            if (idempotencyKey != null) {
                Optional<Sale> existingOpt = saleRepository.findByShop_IdAndIdempotencyKey(shopId, idempotencyKey);
                if (existingOpt.isPresent()) {
                    Sale existingSale = existingOpt.get();
                    verifyPayloadMatch(request, existingSale);
                    return mapToSaleResponse(existingSale);
                }
            }
            throw ex;
        }
    }

    /**
     * Retrieve all sales for the authenticated shop.
     */
    @Transactional(readOnly = true)
    public List<SaleResponse> getAllSales(Long shopId) {
        return saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopId)
                .stream()
                .map(this::mapToSaleResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieve paginated and filtered sales strictly isolated to the authenticated shop.
     */
    @Transactional(readOnly = true)
    public PageResponse<SaleResponse> getSalesPaged(
            Long shopId,
            String query,
            String startDateStr,
            String endDateStr,
            String paymentMethod,
            String status,
            Integer page,
            Integer size,
            String sortBy,
            String sortDir
    ) {
        LocalDateTime[] dates = resolveDateBoundaries(startDateStr, endDateStr);
        String pm = sanitizePaymentMethod(paymentMethod);
        String st = sanitizeStatus(status);

        int targetPage = (page != null) ? Math.max(0, page) : 0;
        int targetSize = (size != null) ? Math.min(Math.max(1, size), 100) : 20;

        String sortField = "createdAt";
        if (sortBy != null && !sortBy.isBlank()) {
            String trimmed = sortBy.trim();
            if ("totalAmount".equalsIgnoreCase(trimmed)) {
                sortField = "totalAmount";
            } else if ("createdAt".equalsIgnoreCase(trimmed)) {
                sortField = "createdAt";
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid sortBy: " + sortBy + ". Allowed: createdAt, totalAmount");
            }
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (sortDir != null && !sortDir.isBlank()) {
            String trimmed = sortDir.trim().toLowerCase(Locale.ROOT);
            if ("asc".equals(trimmed)) {
                direction = Sort.Direction.ASC;
            } else if ("desc".equals(trimmed)) {
                direction = Sort.Direction.DESC;
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid sortDir: " + sortDir + ". Allowed: asc, desc");
            }
        }

        Pageable pageable = PageRequest.of(targetPage, targetSize, Sort.by(direction, sortField));
        Specification<Sale> spec = buildFilterSpecification(shopId, query, dates[0], dates[1], pm, st);

        Page<Sale> pageResult = saleRepository.findAll(spec, pageable);
        List<SaleResponse> content = pageResult.getContent().stream()
                .map(this::mapToSaleResponse)
                .collect(Collectors.toList());

        return PageResponse.<SaleResponse>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .build();
    }

    /**
     * Compute summary metrics (totalSales, totalRevenue, averageSale) for filtered COMPLETED sales.
     */
    @Transactional(readOnly = true)
    public SalesSummaryResponse getSalesSummary(
            Long shopId,
            String query,
            String startDateStr,
            String endDateStr,
            String paymentMethod,
            String status
    ) {
        LocalDateTime[] dates = resolveDateBoundaries(startDateStr, endDateStr);
        String pm = sanitizePaymentMethod(paymentMethod);
        // Summary is calculated for COMPLETED sales only
        String st = (status != null && !status.isBlank()) ? sanitizeStatus(status) : "COMPLETED";

        Specification<Sale> spec = buildFilterSpecification(shopId, query, dates[0], dates[1], pm, st);
        List<Sale> matchingSales = saleRepository.findAll(spec);

        long totalSales = matchingSales.size();
        BigDecimal totalRevenue = matchingSales.stream()
                .map(Sale::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal averageSale = totalSales > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalSales), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return SalesSummaryResponse.builder()
                .totalSales(totalSales)
                .totalRevenue(totalRevenue)
                .averageSale(averageSale)
                .build();
    }

    /**
     * Parse and validate start and end date boundaries in Asia/Colombo timezone.
     */
    private LocalDateTime[] resolveDateBoundaries(String startDateStr, String endDateStr) {
        LocalDate startDate = null;
        if (startDateStr != null && !startDateStr.isBlank()) {
            try {
                startDate = LocalDate.parse(startDateStr.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid startDate format: " + startDateStr + ". Expected YYYY-MM-DD");
            }
        }

        LocalDate endDate = null;
        if (endDateStr != null && !endDateStr.isBlank()) {
            try {
                endDate = LocalDate.parse(endDateStr.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid endDate format: " + endDateStr + ". Expected YYYY-MM-DD");
            }
        }

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate cannot be after endDate");
        }

        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTimeExclusive = endDate != null ? endDate.plusDays(1).atStartOfDay() : null;

        return new LocalDateTime[]{startDateTime, endDateTimeExclusive};
    }

    /**
     * Validate and sanitize payment method parameter.
     */
    private String sanitizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank() || "ALL".equalsIgnoreCase(paymentMethod.trim())) {
            return null;
        }
        String pm = paymentMethod.trim().toUpperCase(Locale.ROOT);
        if (!List.of("CASH", "CARD").contains(pm)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid paymentMethod: " + paymentMethod + ". Allowed: CASH, CARD");
        }
        return pm;
    }

    /**
     * Validate and sanitize status parameter.
     */
    private String sanitizeStatus(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status.trim())) {
            return null;
        }
        String st = status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("COMPLETED").contains(st)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status + ". Allowed: COMPLETED");
        }
        return st;
    }

    /**
     * Dynamic Specification for multi-tenant Sales search, date-range, and status filtering.
     */
    private Specification<Sale> buildFilterSpecification(
            Long shopId,
            String query,
            LocalDateTime startDateTime,
            LocalDateTime endDateTimeExclusive,
            String paymentMethod,
            String status
    ) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Strict Tenant Isolation
            predicates.add(cb.equal(root.get("shop").get("id"), shopId));

            // 2. Query search across receipt number, customer name, customer phone
            if (query != null && !query.trim().isEmpty()) {
                String pattern = "%" + query.trim().toLowerCase() + "%";
                Predicate receiptMatch = cb.like(cb.lower(root.get("receiptNumber")), pattern);
                Predicate customerMatch = cb.like(cb.lower(root.get("customerName")), pattern);
                Predicate phoneMatch = cb.like(cb.lower(root.get("customerPhone")), pattern);
                predicates.add(cb.or(receiptMatch, customerMatch, phoneMatch));
            }

            // 3. Half-open date range [startDateTime, endDateTimeExclusive)
            if (startDateTime != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDateTime));
            }
            if (endDateTimeExclusive != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), endDateTimeExclusive));
            }

            // 4. Payment method filter
            if (paymentMethod != null) {
                predicates.add(cb.equal(cb.upper(root.get("paymentMethod")), paymentMethod));
            }

            // 5. Status filter
            if (status != null) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Retrieve a specific sale by ID, strictly scoped to the authenticated shop.
     */
    @Transactional(readOnly = true)
    public Optional<SaleResponse> getSaleById(Long id, Long shopId) {
        return saleRepository.findByIdAndShop_Id(id, shopId)
                .map(this::mapToSaleResponse);
    }

    /**
     * Generate collision-resistant receipt number: REC-YYYYMMDD-XXXXXX
     */
    private String generateUniqueReceiptNumber() {
        String datePrefix = "REC-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-";
        for (int i = 0; i < 10; i++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
            String candidate = datePrefix + suffix;
            if (!saleRepository.existsByReceiptNumber(candidate)) {
                return candidate;
            }
        }
        return datePrefix + System.currentTimeMillis();
    }

    /**
     * Detect payload mismatch when reusing an idempotency key.
     */
    private void verifyPayloadMatch(SaleRequest request, Sale existingSale) {
        // Verify payment method
        String reqPaymentMethod = request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()
                ? request.getPaymentMethod().trim().toUpperCase(Locale.ROOT)
                : "CASH";
        if (!existingSale.getPaymentMethod().equalsIgnoreCase(reqPaymentMethod)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key reused with mismatched payment method");
        }

        // Verify discount type
        String reqDiscountType = request.getDiscountType() != null && !request.getDiscountType().isBlank()
                ? request.getDiscountType().trim().toUpperCase(Locale.ROOT)
                : "NONE";
        if (!existingSale.getDiscountType().equalsIgnoreCase(reqDiscountType)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key reused with mismatched discount type");
        }

        // Verify item count
        if (request.getItems().size() != existingSale.getItems().size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key reused with mismatched items count");
        }

        // Verify items productId and quantities
        Map<Long, Integer> reqItemMap = new HashMap<>();
        for (SaleItemRequest itemReq : request.getItems()) {
            reqItemMap.merge(itemReq.getProductId(), itemReq.getQuantity(), Integer::sum);
        }

        Map<Long, Integer> existingItemMap = new HashMap<>();
        for (SaleItem item : existingSale.getItems()) {
            Long prodId = item.getProduct() != null ? item.getProduct().getId() : null;
            if (prodId != null) {
                existingItemMap.merge(prodId, item.getQuantity(), Integer::sum);
            }
        }

        if (!reqItemMap.equals(existingItemMap)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key reused with mismatched product items or quantities");
        }
    }

    /**
     * Map Sale entity to SaleResponse DTO.
     */
    private SaleResponse mapToSaleResponse(Sale sale) {
        List<SaleItemResponse> itemResponses = sale.getItems().stream()
                .map(item -> SaleItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                        .productName(item.getProductName())
                        .unitPrice(item.getUnitPrice())
                        .quantity(item.getQuantity())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return SaleResponse.builder()
                .id(sale.getId())
                .receiptNumber(sale.getReceiptNumber())
                .idempotencyKey(sale.getIdempotencyKey())
                .shopId(sale.getShop() != null ? sale.getShop().getId() : null)
                .cashierId(sale.getCashier() != null ? sale.getCashier().getId() : null)
                .cashierName(sale.getCashier() != null ? sale.getCashier().getFullName() : null)
                .customerName(sale.getCustomerName())
                .customerPhone(sale.getCustomerPhone())
                .status(sale.getStatus())
                .paymentMethod(sale.getPaymentMethod())
                .subtotal(sale.getSubtotal())
                .discountType(sale.getDiscountType())
                .discountValue(sale.getDiscountValue())
                .discountAmount(sale.getDiscountAmount())
                .taxAmount(sale.getTaxAmount())
                .totalAmount(sale.getTotalAmount())
                .amountTendered(sale.getAmountTendered())
                .changeAmount(sale.getChangeAmount())
                .notes(sale.getNotes())
                .createdAt(sale.getCreatedAt() != null ? sale.getCreatedAt().toString() : null)
                .itemCount(sale.getItems() != null
                        ? sale.getItems().stream().mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 1).sum()
                        : 0)
                .items(itemResponses)
                .build();
    }
}

