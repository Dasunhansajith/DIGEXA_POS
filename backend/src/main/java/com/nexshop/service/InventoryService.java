package com.nexshop.service;

import com.nexshop.dto.InventoryAdjustmentResponse;
import com.nexshop.dto.InventoryOverviewResponse;
import com.nexshop.dto.InventoryProductResponse;
import com.nexshop.dto.StockAdjustmentRequest;
import com.nexshop.dto.UpdateThresholdRequest;
import com.nexshop.model.AdjustmentReason;
import com.nexshop.model.InventoryAdjustment;
import com.nexshop.model.InventoryStatus;
import com.nexshop.model.Product;
import com.nexshop.model.User;
import com.nexshop.repository.InventoryAdjustmentRepository;
import com.nexshop.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class InventoryService {

    private final ProductRepository productRepository;
    private final InventoryAdjustmentRepository inventoryAdjustmentRepository;

    @Autowired
    public InventoryService(ProductRepository productRepository,
                            InventoryAdjustmentRepository inventoryAdjustmentRepository) {
        this.productRepository = productRepository;
        this.inventoryAdjustmentRepository = inventoryAdjustmentRepository;
    }

    /**
     * Get inventory overview metrics for the given shop.
     */
    public InventoryOverviewResponse getOverview(Long shopId) {
        Long totalProducts = productRepository.countAllByShopId(shopId);
        Long totalUnits = productRepository.sumStockByShopId(shopId);
        Long inStock = productRepository.countInStockByShopId(shopId);
        Long lowStock = productRepository.countLowStockByShopId(shopId);
        Long outOfStock = productRepository.countOutOfStockByShopId(shopId);

        return InventoryOverviewResponse.builder()
                .totalProducts(totalProducts != null ? totalProducts : 0L)
                .totalUnitsInStock(totalUnits != null ? totalUnits : 0L)
                .inStockProducts(inStock != null ? inStock : 0L)
                .lowStockProducts(lowStock != null ? lowStock : 0L)
                .outOfStockProducts(outOfStock != null ? outOfStock : 0L)
                .build();
    }

    /**
     * Get products with their inventory status and thresholds, strictly tenant-isolated.
     * Supports filtering by status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK), query, and category.
     */
    public List<InventoryProductResponse> getProducts(Long shopId, String status, String query, String category) {
        InventoryStatus filterStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                filterStatus = InventoryStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid inventory status: " + status + ". Allowed values: IN_STOCK, LOW_STOCK, OUT_OF_STOCK");
            }
        }

        boolean hasQuery = query != null && !query.trim().isEmpty();
        boolean hasCategory = category != null && !category.trim().isEmpty();

        List<Product> products;
        if (hasQuery && hasCategory) {
            products = productRepository.findByNameContainingIgnoreCaseAndCategoryIgnoreCaseAndShop_Id(
                    query.trim(), category.trim(), shopId);
        } else if (hasQuery) {
            products = productRepository.findByNameContainingIgnoreCaseAndShop_Id(query.trim(), shopId);
        } else if (hasCategory) {
            products = productRepository.findByCategoryIgnoreCaseAndShop_Id(category.trim(), shopId);
        } else {
            products = productRepository.findAllByShop_Id(shopId);
        }

        final InventoryStatus targetStatus = filterStatus;
        return products.stream()
                .map(InventoryProductResponse::fromEntity)
                .filter(resp -> targetStatus == null || resp.getInventoryStatus() == targetStatus)
                .toList();
    }

    /**
     * Atomically adjust product stock using pessimistic write locking and audit the change.
     */
    @Transactional
    public InventoryProductResponse adjustStock(Long shopId, Long productId, StockAdjustmentRequest request, User user) {
        if (request.getAdjustment() == null || request.getAdjustment() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adjustment quantity cannot be zero");
        }

        if (request.getReason() == null || !AdjustmentReason.isValid(request.getReason())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid adjustment reason: " + request.getReason() +
                            ". Allowed values: STOCK_RECEIVED, DAMAGED, EXPIRED, MANUAL_CORRECTION");
        }

        // Pessimistic write lock for concurrency safety and tenant isolation
        Product product = productRepository.findByIdAndShop_IdForUpdate(productId, shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        int previousStock = product.getStock() != null ? product.getStock() : 0;
        int newStock = previousStock + request.getAdjustment();

        if (newStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Insufficient stock. Current stock is " + previousStock +
                            ", adjustment is " + request.getAdjustment() +
                            ", resulting stock cannot be negative.");
        }

        product.setStock(newStock);
        productRepository.save(product);

        InventoryAdjustment adjustment = InventoryAdjustment.builder()
                .shop(product.getShop())
                .product(product)
                .user(user)
                .adjustmentQuantity(request.getAdjustment())
                .previousQuantity(previousStock)
                .newQuantity(newStock)
                .reason(request.getReason().trim().toUpperCase())
                .note(request.getNote() != null ? request.getNote().trim() : null)
                .build();
        inventoryAdjustmentRepository.save(adjustment);

        return InventoryProductResponse.fromEntity(product);
    }

    /**
     * Update the low-stock threshold for a product.
     */
    @Transactional
    public InventoryProductResponse updateThreshold(Long shopId, Long productId, UpdateThresholdRequest request) {
        if (request.getLowStockThreshold() == null || request.getLowStockThreshold() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lowStockThreshold must be greater than or equal to 0");
        }

        Product product = productRepository.findByIdAndShop_Id(productId, shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        product.setLowStockThreshold(request.getLowStockThreshold());
        productRepository.save(product);

        return InventoryProductResponse.fromEntity(product);
    }

    /**
     * Retrieve audit history of inventory adjustments for the authenticated shop.
     */
    public List<InventoryAdjustmentResponse> getAdjustments(Long shopId, Long productId, int page, int size) {
        int sanitizedPage = Math.max(page, 0);
        int sanitizedSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(sanitizedPage, sanitizedSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<InventoryAdjustment> pageResult;
        if (productId != null) {
            if (!productRepository.existsByIdAndShop_Id(productId, shopId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found in this shop");
            }
            pageResult = inventoryAdjustmentRepository.findAllByShop_IdAndProduct_IdOrderByCreatedAtDesc(shopId, productId, pageable);
        } else {
            pageResult = inventoryAdjustmentRepository.findAllByShop_IdOrderByCreatedAtDesc(shopId, pageable);
        }

        return pageResult.stream()
                .map(InventoryAdjustmentResponse::fromEntity)
                .toList();
    }
}

