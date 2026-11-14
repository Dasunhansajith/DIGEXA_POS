package com.nexshop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.SaleItemRequest;
import com.nexshop.dto.SaleRequest;
import com.nexshop.dto.SaleResponse;
import com.nexshop.model.Product;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.ProductRepository;
import com.nexshop.repository.SaleItemRepository;
import com.nexshop.repository.SaleRepository;
import com.nexshop.repository.ShopRepository;
import com.nexshop.repository.UserRepository;
import com.nexshop.service.JwtService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
public class MultiTenantSaleSecurityTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private Filter springSecurityFilterChain;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private SaleItemRepository saleItemRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Shop shopA;
    private Shop shopB;
    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .addFilters(springSecurityFilterChain)
                .build();

        // 1. Ensure Shop A exists
        shopA = shopRepository.findByEmail("shop_a@sales.test").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Sales Shop Alpha");
            s.setEmail("shop_a@sales.test");
            s.setPhone("0712345678");
            s.setPlan("PRO");
            return shopRepository.save(s);
        });

        // 2. Ensure User A exists
        userA = userRepository.findByEmail("user_a@sales.test").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_a@sales.test");
            u.setFullName("User Alpha");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopA);
            return userRepository.save(u);
        });

        // 3. Ensure Shop B exists
        shopB = shopRepository.findByEmail("shop_b@sales.test").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Sales Shop Beta");
            s.setEmail("shop_b@sales.test");
            s.setPhone("0787654321");
            s.setPlan("FREE");
            return shopRepository.save(s);
        });

        // 4. Ensure User B exists
        userB = userRepository.findByEmail("user_b@sales.test").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_b@sales.test");
            u.setFullName("User Beta");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopB);
            return userRepository.save(u);
        });

        // Generate verified server-side JWT tokens
        tokenA = jwtService.generateToken(userA.getId(), shopA.getId(), userA.getEmail(), userA.getRole());
        tokenB = jwtService.generateToken(userB.getId(), shopB.getId(), userB.getEmail(), userB.getRole());

        // Clean sales and products for clean isolation
        saleRepository.deleteAll(saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopA.getId()));
        saleRepository.deleteAll(saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopB.getId()));
        productRepository.deleteAll(productRepository.findAllByShop_Id(shopA.getId()));
        productRepository.deleteAll(productRepository.findAllByShop_Id(shopB.getId()));
    }

    @Test
    @DisplayName("Successful sale decrements stock atomically and calculates totals using BigDecimal")
    void testSuccessfulSaleCheckout() throws Exception {
        // Setup Product in Shop A
        Product prod = productRepository.save(Product.builder()
                .name("Wireless Mouse")
                .description("Ergonomic 2.4G mouse")
                .price(new BigDecimal("150.00"))
                .category("Electronics")
                .stock(20)
                .shop(shopA)
                .build());

        SaleRequest request = SaleRequest.builder()
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prod.getId())
                                .quantity(2)
                                .build()
                ))
                .customerName("John Doe")
                .customerPhone("0771234567")
                .paymentMethod("CASH")
                .discountType("PERCENT")
                .discountValue(new BigDecimal("10.00")) // 10% of 300.00 = 30.00
                .amountTendered(new BigDecimal("300.00"))
                .notes("Counter pickup")
                .build();

        MvcResult result = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        SaleResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), SaleResponse.class);

        assertNotNull(response.getId());
        assertTrue(response.getReceiptNumber().startsWith("REC-"));
        assertEquals("COMPLETED", response.getStatus());
        assertEquals("CASH", response.getPaymentMethod());
        assertEquals(shopA.getId(), response.getShopId());
        assertEquals(userA.getId(), response.getCashierId());
        assertEquals("User Alpha", response.getCashierName());

        // Verify BigDecimal Calculations: 2 * 150.00 = 300.00, 10% discount = 30.00, total = 270.00, change = 30.00
        assertEquals(new BigDecimal("300.00"), response.getSubtotal());
        assertEquals(new BigDecimal("30.00"), response.getDiscountAmount());
        assertEquals(new BigDecimal("270.00"), response.getTotalAmount());
        assertEquals(new BigDecimal("300.00"), response.getAmountTendered());
        assertEquals(new BigDecimal("30.00"), response.getChangeAmount());

        // Verify stock decremented in database
        Product updatedProd = productRepository.findById(prod.getId()).orElseThrow();
        assertEquals(18, updatedProd.getStock(), "Stock must be decremented from 20 to 18");

        // Verify historical sale line item persisted
        assertEquals(1, response.getItems().size());
        assertEquals("Wireless Mouse", response.getItems().get(0).getProductName());
        assertEquals(new BigDecimal("150.00"), response.getItems().get(0).getUnitPrice());
        assertEquals(2, response.getItems().get(0).getQuantity());
        assertEquals(new BigDecimal("300.00"), response.getItems().get(0).getSubtotal());
    }

    @Test
    @DisplayName("Insufficient stock rolls back transaction entirely without stock change")
    void testInsufficientStockRollback() throws Exception {
        Product prod = productRepository.save(Product.builder()
                .name("Limited Item")
                .price(new BigDecimal("100.00"))
                .stock(3)
                .shop(shopA)
                .build());

        SaleRequest request = SaleRequest.builder()
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prod.getId())
                                .quantity(5) // requests 5 when only 3 available
                                .build()
                ))
                .paymentMethod("CASH")
                .amountTendered(new BigDecimal("500.00"))
                .build();

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        // Verify stock untouched in DB
        Product untouchedProd = productRepository.findById(prod.getId()).orElseThrow();
        assertEquals(3, untouchedProd.getStock(), "Stock must remain 3 after failed sale");

        // Verify no sale persisted
        assertEquals(0, saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopA.getId()).size());
    }

    @Test
    @DisplayName("Cross-shop isolation: Shop A user cannot purchase Shop B's product")
    void testCrossShopProductPurchaseForbidden() throws Exception {
        // Product in Shop B
        Product prodB = productRepository.save(Product.builder()
                .name("Beta Exclusive Gadget")
                .price(new BigDecimal("200.00"))
                .stock(10)
                .shop(shopB)
                .build());

        // User A tries to buy Shop B's product
        SaleRequest request = SaleRequest.builder()
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prodB.getId())
                                .quantity(1)
                                .build()
                ))
                .paymentMethod("CASH")
                .build();

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        // Verify Shop B stock remains intact
        Product untouchedB = productRepository.findById(prodB.getId()).orElseThrow();
        assertEquals(10, untouchedB.getStock());
    }

    @Test
    @DisplayName("Cross-shop isolation: Shop A cannot view Shop B's sales")
    void testCrossShopSalesReadIsolation() throws Exception {
        Product prodB = productRepository.save(Product.builder()
                .name("Beta Item")
                .price(new BigDecimal("50.00"))
                .stock(10)
                .shop(shopB)
                .build());

        // User B completes a sale
        SaleRequest requestB = SaleRequest.builder()
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prodB.getId())
                                .quantity(2)
                                .build()
                ))
                .paymentMethod("CASH")
                .build();

        MvcResult resultB = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestB)))
                .andExpect(status().isCreated())
                .andReturn();

        SaleResponse saleResponseB = objectMapper.readValue(resultB.getResponse().getContentAsString(), SaleResponse.class);

        // User A tries to get Shop B's sale by ID -> must return 404 Not Found (no info leakage)
        mockMvc.perform(get("/api/sales/" + saleResponseB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound());

        // User A lists all sales -> must return empty list for Shop A
        MvcResult listResultA = mockMvc.perform(get("/api/sales")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<SaleResponse> salesA = objectMapper.readValue(listResultA.getResponse().getContentAsString(), new TypeReference<>() {});
        assertTrue(salesA.isEmpty());
    }

    @Test
    @DisplayName("Idempotency: Re-submitting with identical idempotency key returns same sale without re-decrementing stock")
    void testIdempotentCheckout() throws Exception {
        Product prod = productRepository.save(Product.builder()
                .name("Keyboard")
                .price(new BigDecimal("80.00"))
                .stock(10)
                .shop(shopA)
                .build());

        String idempotencyKey = "order-idem-99999";

        SaleRequest request = SaleRequest.builder()
                .idempotencyKey(idempotencyKey)
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prod.getId())
                                .quantity(2)
                                .build()
                ))
                .paymentMethod("CASH")
                .amountTendered(new BigDecimal("200.00"))
                .build();

        // First attempt -> Created
        MvcResult result1 = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        SaleResponse resp1 = objectMapper.readValue(result1.getResponse().getContentAsString(), SaleResponse.class);

        // Stock decreased to 8
        Product prodAfterFirst = productRepository.findById(prod.getId()).orElseThrow();
        assertEquals(8, prodAfterFirst.getStock());

        // Second attempt with same key -> Returns existing sale
        MvcResult result2 = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        SaleResponse resp2 = objectMapper.readValue(result2.getResponse().getContentAsString(), SaleResponse.class);

        assertEquals(resp1.getId(), resp2.getId());
        assertEquals(resp1.getReceiptNumber(), resp2.getReceiptNumber());

        // Stock must STILL be 8 (never decremented again)
        Product prodAfterSecond = productRepository.findById(prod.getId()).orElseThrow();
        assertEquals(8, prodAfterSecond.getStock(), "Stock must not be decremented again on idempotent replay");
    }

    @Test
    @DisplayName("Idempotency payload mismatch returns 409 Conflict")
    void testIdempotencyPayloadMismatchConflict() throws Exception {
        Product prod1 = productRepository.save(Product.builder()
                .name("Item 1")
                .price(new BigDecimal("10.00"))
                .stock(10)
                .shop(shopA)
                .build());

        Product prod2 = productRepository.save(Product.builder()
                .name("Item 2")
                .price(new BigDecimal("20.00"))
                .stock(10)
                .shop(shopA)
                .build());

        String idempotencyKey = "order-idem-conflict";

        SaleRequest initialRequest = SaleRequest.builder()
                .idempotencyKey(idempotencyKey)
                .items(List.of(SaleItemRequest.builder().productId(prod1.getId()).quantity(1).build()))
                .paymentMethod("CASH")
                .build();

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initialRequest)))
                .andExpect(status().isCreated());

        // Modified request reusing same idempotency key with different items
        SaleRequest conflictingRequest = SaleRequest.builder()
                .idempotencyKey(idempotencyKey)
                .items(List.of(SaleItemRequest.builder().productId(prod2.getId()).quantity(1).build()))
                .paymentMethod("CASH")
                .build();

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictingRequest)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Cash payment with amount tendered less than total fails with 400 Bad Request")
    void testCashPaymentUnderpaidFails() throws Exception {
        Product prod = productRepository.save(Product.builder()
                .name("Headphones")
                .price(new BigDecimal("120.00"))
                .stock(5)
                .shop(shopA)
                .build());

        SaleRequest request = SaleRequest.builder()
                .items(List.of(SaleItemRequest.builder().productId(prod.getId()).quantity(1).build()))
                .paymentMethod("CASH")
                .amountTendered(new BigDecimal("100.00")) // Needs 120.00
                .build();

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        // Verify stock remains untouched
        assertEquals(5, productRepository.findById(prod.getId()).orElseThrow().getStock());
    }

    @Test
    @DisplayName("Record-only card payment successfully records sale without card processor call")
    void testCardPaymentRecordOnly() throws Exception {
        Product prod = productRepository.save(Product.builder()
                .name("Tablet")
                .price(new BigDecimal("500.00"))
                .stock(4)
                .shop(shopA)
                .build());

        SaleRequest request = SaleRequest.builder()
                .items(List.of(SaleItemRequest.builder().productId(prod.getId()).quantity(1).build()))
                .paymentMethod("CARD")
                .build();

        MvcResult result = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        SaleResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), SaleResponse.class);

        assertEquals("CARD", response.getPaymentMethod());
        assertEquals(new BigDecimal("500.00"), response.getTotalAmount());
        assertEquals(new BigDecimal("500.00"), response.getAmountTendered());
        assertEquals(new BigDecimal("0.00"), response.getChangeAmount());
        assertEquals(3, productRepository.findById(prod.getId()).orElseThrow().getStock());
    }

    @Test
    @DisplayName("Concurrent checkout with pessimistic locking prevents overselling")
    void testConcurrentCheckoutPreventsOverselling() throws Exception {
        // Stock is exactly 3 units
        Product prod = productRepository.save(Product.builder()
                .name("Rare Collectible")
                .price(new BigDecimal("50.00"))
                .stock(3)
                .shop(shopA)
                .build());

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();

                    SaleRequest request = SaleRequest.builder()
                            .idempotencyKey("concurrent-key-" + index)
                            .items(List.of(
                                    SaleItemRequest.builder()
                                            .productId(prod.getId())
                                            .quantity(2) // Each requests 2 units. 2 + 2 = 4 > 3 available
                                            .build()
                            ))
                            .paymentMethod("CASH")
                            .build();

                    MvcResult res = mockMvc.perform(post("/api/sales")
                                    .header("Authorization", "Bearer " + tokenA)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(request)))
                            .andReturn();

                    int status = res.getResponse().getStatus();
                    if (status == 201) {
                        successCount.incrementAndGet();
                    } else if (status == 400) {
                        failCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        // Fire both threads simultaneously
        startLatch.countDown();
        boolean finished = endLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "Both threads must complete within timeout");
        assertEquals(1, successCount.get(), "Exactly one concurrent checkout should succeed");
        assertEquals(1, failCount.get(), "The competing checkout must fail due to insufficient stock");

        // Remaining stock in DB must be exactly 1 (3 - 2)
        Product finalProduct = productRepository.findById(prod.getId()).orElseThrow();
        assertEquals(1, finalProduct.getStock(), "Final stock must be exactly 1, preventing overselling");
    }
}
