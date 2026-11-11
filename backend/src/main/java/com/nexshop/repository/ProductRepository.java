package com.nexshop.repository;

import com.nexshop.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByShop_Id(Long shopId);

    Optional<Product> findByIdAndShop_Id(Long id, Long shopId);

    List<Product> findByCategoryIgnoreCaseAndShop_Id(String category, Long shopId);

    List<Product> findByNameContainingIgnoreCaseAndShop_Id(String name, Long shopId);

    List<Product> findByNameContainingIgnoreCaseAndCategoryIgnoreCaseAndShop_Id(String name, String category, Long shopId);

    boolean existsByIdAndShop_Id(Long id, Long shopId);
}
