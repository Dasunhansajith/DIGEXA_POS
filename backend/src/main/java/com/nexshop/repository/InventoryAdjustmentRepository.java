package com.nexshop.repository;

import com.nexshop.model.InventoryAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustment, Long> {

    List<InventoryAdjustment> findAllByShop_IdOrderByCreatedAtDesc(Long shopId);

    Page<InventoryAdjustment> findAllByShop_IdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    List<InventoryAdjustment> findAllByShop_IdAndProduct_IdOrderByCreatedAtDesc(Long shopId, Long productId);

    Page<InventoryAdjustment> findAllByShop_IdAndProduct_IdOrderByCreatedAtDesc(Long shopId, Long productId, Pageable pageable);
}

