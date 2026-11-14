package com.nexshop.repository;

import com.nexshop.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long>, JpaSpecificationExecutor<Sale> {

    List<Sale> findAllByShop_IdOrderByCreatedAtDesc(Long shopId);

    Optional<Sale> findByIdAndShop_Id(Long id, Long shopId);

    Optional<Sale> findByShop_IdAndIdempotencyKey(Long shopId, String idempotencyKey);

    boolean existsByReceiptNumber(String receiptNumber);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0.00) FROM Sale s " +
           "WHERE s.shop.id = :shopId AND s.status = 'COMPLETED' " +
           "AND s.createdAt >= :startDate AND s.createdAt < :endDate")
    BigDecimal calculateTotalRevenue(
            @Param("shopId") Long shopId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT COUNT(s) FROM Sale s " +
           "WHERE s.shop.id = :shopId AND s.status = 'COMPLETED' " +
           "AND s.createdAt >= :startDate AND s.createdAt < :endDate")
    Long countCompletedSales(
            @Param("shopId") Long shopId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT DISTINCT s FROM Sale s " +
           "LEFT JOIN FETCH s.items " +
           "WHERE s.shop.id = :shopId AND s.status = 'COMPLETED' " +
           "AND s.createdAt >= :startDate AND s.createdAt < :endDate " +
           "ORDER BY s.createdAt ASC")
    List<Sale> findCompletedSalesWithItemsInRange(
            @Param("shopId") Long shopId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}


