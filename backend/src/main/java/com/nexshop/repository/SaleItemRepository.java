package com.nexshop.repository;

import com.nexshop.model.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    List<SaleItem> findAllBySale_Id(Long saleId);

    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM SaleItem i " +
           "WHERE i.sale.shop.id = :shopId AND i.sale.status = 'COMPLETED' " +
           "AND i.sale.createdAt >= :startDate AND i.sale.createdAt < :endDate")
    Long sumSoldQuantities(
            @Param("shopId") Long shopId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT i FROM SaleItem i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE i.sale.shop.id = :shopId AND i.sale.status = 'COMPLETED' " +
           "AND i.sale.createdAt >= :startDate AND i.sale.createdAt < :endDate")
    List<SaleItem> findSaleItemsInRange(
            @Param("shopId") Long shopId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}


