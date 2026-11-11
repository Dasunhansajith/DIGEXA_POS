package com.nexshop.service;

import com.nexshop.dto.ProductRequest;
import com.nexshop.dto.ProductResponse;
import com.nexshop.model.Product;
import com.nexshop.model.Shop;
import com.nexshop.repository.ProductRepository;
import com.nexshop.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;

    @Autowired
    public ProductService(ProductRepository productRepository, ShopRepository shopRepository) {
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
    }

    public List<ProductResponse> getAllProducts(Long shopId) {
        return productRepository.findAllByShop_Id(shopId)
                .stream()
                .map(ProductResponse::fromEntity)
                .toList();
    }

    public Optional<ProductResponse> getProductById(Long id, Long shopId) {
        return productRepository.findByIdAndShop_Id(id, shopId)
                .map(ProductResponse::fromEntity);
    }

    public List<ProductResponse> getProductsByCategory(String category, Long shopId) {
        return productRepository.findByCategoryIgnoreCaseAndShop_Id(category, shopId)
                .stream()
                .map(ProductResponse::fromEntity)
                .toList();
    }

    public List<ProductResponse> searchProducts(String query, Long shopId) {
        return productRepository.findByNameContainingIgnoreCaseAndShop_Id(query, shopId)
                .stream()
                .map(ProductResponse::fromEntity)
                .toList();
    }

    public List<ProductResponse> searchAndFilterProducts(String query, String category, Long shopId) {
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

        return products.stream()
                .map(ProductResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request, Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));

        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setCategory(request.getCategory());
        product.setImageUrl(request.getImageUrl());
        product.setStock(request.getStock() != null ? request.getStock() : 0);
        product.setShop(shop);

        Product saved = productRepository.save(product);
        return ProductResponse.fromEntity(saved);
    }

    @Transactional
    public Optional<ProductResponse> updateProduct(Long id, ProductRequest request, Long shopId) {
        return productRepository.findByIdAndShop_Id(id, shopId)
                .map(existing -> {
                    existing.setName(request.getName());
                    existing.setDescription(request.getDescription());
                    existing.setPrice(request.getPrice());
                    existing.setCategory(request.getCategory());
                    existing.setImageUrl(request.getImageUrl());
                    if (request.getStock() != null) {
                        existing.setStock(request.getStock());
                    }
                    // Shop association is never replaced or trusted from request body
                    Product updated = productRepository.save(existing);
                    return ProductResponse.fromEntity(updated);
                });
    }

    @Transactional
    public boolean deleteProduct(Long id, Long shopId) {
        return productRepository.findByIdAndShop_Id(id, shopId)
                .map(product -> {
                    productRepository.delete(product);
                    return true;
                })
                .orElse(false);
    }
}
