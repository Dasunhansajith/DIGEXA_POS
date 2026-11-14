package com.nexshop.repository;

import com.nexshop.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByShop_Id(Long shopId);

    Optional<Product> findByIdAndShop_Id(Long id, Long shopId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id AND p.shop.id = :shopId")
    Optional<Product> findByIdAndShop_IdForUpdate(@Param("id") Long id, @Param("shopId") Long shopId);

    List<Product> findByCategoryIgnoreCaseAndShop_Id(String category, Long shopId);

    List<Product> findByNameContainingIgnoreCaseAndShop_Id(String name, Long shopId);

    List<Product> findByNameContainingIgnoreCaseAndCategoryIgnoreCaseAndShop_Id(String name, String category, Long shopId);

    boolean existsByIdAndShop_Id(Long id, Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId")
    Long countAllByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COALESCE(SUM(p.stock), 0) FROM Product p WHERE p.shop.id = :shopId")
    Long sumStockByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId AND p.stock > p.lowStockThreshold")
    Long countInStockByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId AND p.stock > 0 AND p.stock <= p.lowStockThreshold")
    Long countLowStockByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId AND (p.stock <= 0 OR p.stock IS NULL)")
    Long countOutOfStockByShopId(@Param("shopId") Long shopId);
}

