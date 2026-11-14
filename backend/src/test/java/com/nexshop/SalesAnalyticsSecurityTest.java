package com.nexshop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.AnalyticsOverviewResponse;
import com.nexshop.dto.DailyRevenueTrend;
import com.nexshop.dto.TopProductResponse;
import com.nexshop.model.Product;
import com.nexshop.model.Sale;
import com.nexshop.model.SaleItem;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.ProductRepository;
import com.nexshop.repository.SaleItemRepository;
import com.nexshop.repository.SaleRepository;
import com.nexshop.repository.ShopRepository;
import com.nexshop.repository.UserRepository;
import com.nexshop.service.JwtService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class SalesAnalyticsSecurityTest {

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

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private MockMvc mockMvc;

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

        // 1. Setup isolated test Shop A
        shopA = shopRepository.findByEmail("analytics_a@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Analytics Shop Alpha");
            s.setEmail("analytics_a@test.com");
            s.setPhone("0711111111");
            s.setPlan("PRO");
            return shopRepository.save(s);
        });

        // 2. Setup isolated test User A
        userA = userRepository.findByEmail("analytics_user_a@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("analytics_user_a@test.com");
            u.setFullName("Analytics Alpha");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopA);
            return userRepository.save(u);
        });

        // 3. Setup isolated test Shop B
        shopB = shopRepository.findByEmail("analytics_b@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Analytics Shop Beta");
            s.setEmail("analytics_b@test.com");
            s.setPhone("0722222222");
            s.setPlan("FREE");
            return shopRepository.save(s);
        });

        // 4. Setup isolated test User B
        userB = userRepository.findByEmail("analytics_user_b@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("analytics_user_b@test.com");
            u.setFullName("Analytics Beta");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopB);
            return userRepository.save(u);
        });

        // 5. Generate verified JWT tokens
        tokenA = jwtService.generateToken(userA.getId(), shopA.getId(), userA.getEmail(), userA.getRole());
        tokenB = jwtService.generateToken(userB.getId(), shopB.getId(), userB.getEmail(), userB.getRole());

        // Clean any leftovers for these two test shops
        cleanTestData();
    }

    @AfterEach
    void tearDown() {
        cleanTestData();
    }

    private void cleanTestData() {
        if (shopA != null && shopA.getId() != null) {
            saleRepository.deleteAll(saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopA.getId()));
            productRepository.deleteAll(productRepository.findAllByShop_Id(shopA.getId()));
        }
        if (shopB != null && shopB.getId() != null) {
            saleRepository.deleteAll(saleRepository.findAllByShop_IdOrderByCreatedAtDesc(shopB.getId()));
            productRepository.deleteAll(productRepository.findAllByShop_Id(shopB.getId()));
        }
    }

    @Test
    @DisplayName("Unauthenticated requests to /api/analytics endpoints return 401 Unauthorized")
    void testUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/analytics/overview"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/analytics/revenue-trend"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/analytics/top-products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Empty sales data returns zero values and empty structures without throwing errors")
    void testEmptyDataHandling() throws Exception {
        // Overview for shop with 0 sales
        MvcResult overviewResult = mockMvc.perform(get("/api/analytics/overview")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        AnalyticsOverviewResponse overview = objectMapper.readValue(
                overviewResult.getResponse().getContentAsString(),
                AnalyticsOverviewResponse.class
        );

        assertNotNull(overview);
        assertEquals(new BigDecimal("0.00"), overview.getTotalRevenue());
        assertEquals(0L, overview.getTotalTransactions());
        assertEquals(0L, overview.getItemsSold());
        assertEquals(new BigDecimal("0.00"), overview.getAverageTransactionValue());
        assertEquals("last30days", overview.getPeriod());

        // Trend for 7 days returns 7 zero-filled days
        MvcResult trendResult = mockMvc.perform(get("/api/analytics/revenue-trend?period=last7days")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<DailyRevenueTrend> trend = objectMapper.readValue(
                trendResult.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(7, trend.size());
        for (DailyRevenueTrend day : trend) {
            assertEquals(new BigDecimal("0.00"), day.getRevenue());
            assertEquals(0L, day.getTransactionCount());
            assertEquals(0L, day.getItemsSold());
        }

        // Top products returns empty list
        MvcResult topProductsResult = mockMvc.perform(get("/api/analytics/top-products")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<TopProductResponse> topProducts = objectMapper.readValue(
                topProductsResult.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertTrue(topProducts.isEmpty());
    }

    @Test
    @DisplayName("Financial aggregation calculates exact totals using BigDecimal and excludes non-completed sales")
    void testOverviewFinancialAggregationAccuracy() throws Exception {
        Product mouse = productRepository.save(Product.builder()
                .name("Optical Mouse")
                .price(new BigDecimal("150.00"))
                .category("Electronics")
                .stock(50)
                .shop(shopA)
                .build());

        Product keyboard = productRepository.save(Product.builder()
                .name("Mechanical Keyboard")
                .price(new BigDecimal("500.00"))
                .category("Electronics")
                .stock(20)
                .shop(shopA)
                .build());

        // Sale 1: Completed (2x Mouse = 300.00)
        Sale sale1 = Sale.builder()
                .receiptNumber("REC-TEST-001")
                .shop(shopA)
                .cashier(userA)
                .status("COMPLETED")
                .paymentMethod("CASH")
                .subtotal(new BigDecimal("300.00"))
                .totalAmount(new BigDecimal("300.00"))
                .createdAt(LocalDateTime.now())
                .build();
        sale1.addItem(SaleItem.builder()
                .product(mouse)
                .productName(mouse.getName())
                .unitPrice(mouse.getPrice())
                .quantity(2)
                .subtotal(new BigDecimal("300.00"))
                .build());
        saleRepository.save(sale1);

        // Sale 2: Completed (1x Keyboard @ 500, 1x Mouse @ 150 = 650.00)
        Sale sale2 = Sale.builder()
                .receiptNumber("REC-TEST-002")
                .shop(shopA)
                .cashier(userA)
                .status("COMPLETED")
                .paymentMethod("CASH")
                .subtotal(new BigDecimal("650.00"))
                .totalAmount(new BigDecimal("650.00"))
                .createdAt(LocalDateTime.now())
                .build();
        sale2.addItem(SaleItem.builder()
                .product(keyboard)
                .productName(keyboard.getName())
                .unitPrice(keyboard.getPrice())
                .quantity(1)
                .subtotal(new BigDecimal("500.00"))
                .build());
        sale2.addItem(SaleItem.builder()
                .product(mouse)
                .productName(mouse.getName())
                .unitPrice(mouse.getPrice())
                .quantity(1)
                .subtotal(new BigDecimal("150.00"))
                .build());
        saleRepository.save(sale2);

        // Sale 3: CANCELLED (must NOT be counted)
        Sale sale3 = Sale.builder()
                .receiptNumber("REC-TEST-003")
                .shop(shopA)
                .cashier(userA)
                .status("CANCELLED")
                .paymentMethod("CASH")
                .subtotal(new BigDecimal("1000.00"))
                .totalAmount(new BigDecimal("1000.00"))
                .createdAt(LocalDateTime.now())
                .build();
        sale3.addItem(SaleItem.builder()
                .product(keyboard)
                .productName(keyboard.getName())
                .unitPrice(keyboard.getPrice())
                .quantity(2)
                .subtotal(new BigDecimal("1000.00"))
                .build());
        saleRepository.save(sale3);

        // Request overview for today
        MvcResult result = mockMvc.perform(get("/api/analytics/overview?period=today")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        AnalyticsOverviewResponse overview = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AnalyticsOverviewResponse.class
        );

        // Revenue: 300.00 + 650.00 = 950.00
        assertEquals(new BigDecimal("950.00"), overview.getTotalRevenue());
        // Transactions: 2 completed
        assertEquals(2L, overview.getTotalTransactions());
        // Items sold: (2) + (1 + 1) = 4
        assertEquals(4L, overview.getItemsSold());
        // Average transaction value: 950.00 / 2 = 475.00
        assertEquals(new BigDecimal("475.00"), overview.getAverageTransactionValue());
    }

    @Test
    @DisplayName("Strict multi-tenant isolation ensures Shop B cannot see Shop A analytics")
    void testStrictMultiTenantIsolation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Shop A Exclusive Item")
                .price(new BigDecimal("1200.00"))
                .category("Special")
                .stock(10)
                .shop(shopA)
                .build());

        Sale saleA = Sale.builder()
                .receiptNumber("REC-ALPHA-999")
                .shop(shopA)
                .cashier(userA)
                .status("COMPLETED")
                .paymentMethod("CARD")
                .subtotal(new BigDecimal("1200.00"))
                .totalAmount(new BigDecimal("1200.00"))
                .createdAt(LocalDateTime.now())
                .build();
        saleA.addItem(SaleItem.builder()
                .product(prodA)
                .productName(prodA.getName())
                .unitPrice(prodA.getPrice())
                .quantity(1)
                .subtotal(new BigDecimal("1200.00"))
                .build());
        saleRepository.save(saleA);

        // Shop B queries overview with valid token B
        MvcResult overviewB = mockMvc.perform(get("/api/analytics/overview?period=today")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        AnalyticsOverviewResponse resB = objectMapper.readValue(
                overviewB.getResponse().getContentAsString(),
                AnalyticsOverviewResponse.class
        );

        // Shop B must see 0 values despite Shop A having completed sales
        assertEquals(new BigDecimal("0.00"), resB.getTotalRevenue());
        assertEquals(0L, resB.getTotalTransactions());
        assertEquals(0L, resB.getItemsSold());

        // Shop B top products must be empty
        MvcResult topB = mockMvc.perform(get("/api/analytics/top-products?period=today")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        List<TopProductResponse> productsB = objectMapper.readValue(
                topB.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );
        assertTrue(productsB.isEmpty());
    }

    @Test
    @DisplayName("Top products endpoint ranks items by quantity sold and supports limit parameter")
    void testTopProductsRankingAndLimit() throws Exception {
        Product p1 = productRepository.save(Product.builder()
                .name("USB Cable")
                .price(new BigDecimal("20.00"))
                .category("Accessories")
                .stock(100)
                .shop(shopA)
                .build());

        Product p2 = productRepository.save(Product.builder()
                .name("Power Bank")
                .price(new BigDecimal("100.00"))
                .category("Accessories")
                .stock(50)
                .shop(shopA)
                .build());

        // Sale: 5 USB Cables ($100.00) and 1 Power Bank ($100.00)
        Sale sale = Sale.builder()
                .receiptNumber("REC-TOP-001")
                .shop(shopA)
                .cashier(userA)
                .status("COMPLETED")
                .paymentMethod("CASH")
                .subtotal(new BigDecimal("200.00"))
                .totalAmount(new BigDecimal("200.00"))
                .createdAt(LocalDateTime.now())
                .build();
        sale.addItem(SaleItem.builder()
                .product(p1)
                .productName(p1.getName())
                .unitPrice(p1.getPrice())
                .quantity(5)
                .subtotal(new BigDecimal("100.00"))
                .build());
        sale.addItem(SaleItem.builder()
                .product(p2)
                .productName(p2.getName())
                .unitPrice(p2.getPrice())
                .quantity(1)
                .subtotal(new BigDecimal("100.00"))
                .build());
        saleRepository.save(sale);

        // Query top products with default limit
        MvcResult res = mockMvc.perform(get("/api/analytics/top-products?period=today")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<TopProductResponse> list = objectMapper.readValue(
                res.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(2, list.size());
        assertEquals("USB Cable", list.get(0).getProductName());
        assertEquals(5L, list.get(0).getQuantitySold());
        assertEquals(new BigDecimal("100.00"), list.get(0).getTotalRevenue());

        assertEquals("Power Bank", list.get(1).getProductName());
        assertEquals(1L, list.get(1).getQuantitySold());
        assertEquals(new BigDecimal("100.00"), list.get(1).getTotalRevenue());

        // Query with limit=1
        MvcResult resLimit = mockMvc.perform(get("/api/analytics/top-products?period=today&limit=1")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<TopProductResponse> listLimit = objectMapper.readValue(
                resLimit.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(1, listLimit.size());
        assertEquals("USB Cable", listLimit.get(0).getProductName());
    }

    @Test
    @DisplayName("Date range filtering handles custom dates and rejects invalid start/end ranges")
    void testDateRangeFilteringAndValidation() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(7);

        // Valid custom range
        mockMvc.perform(get("/api/analytics/overview")
                        .param("startDate", sevenDaysAgo.toString())
                        .param("endDate", today.toString())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());

        // Invalid custom range: startDate after endDate must return 400 Bad Request
        mockMvc.perform(get("/api/analytics/overview")
                        .param("startDate", today.toString())
                        .param("endDate", sevenDaysAgo.toString())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Daily revenue trend produces continuous timeline with exact dates and amounts")
    void testRevenueTrendContinuousTimeline() throws Exception {
        Product prod = productRepository.save(Product.builder()
                .name("Widget")
                .price(new BigDecimal("50.00"))
                .stock(100)
                .shop(shopA)
                .build());

        Sale saleToday = Sale.builder()
                .receiptNumber("REC-TODAY-01")
                .shop(shopA)
                .cashier(userA)
                .status("COMPLETED")
                .paymentMethod("CASH")
                .subtotal(new BigDecimal("150.00"))
                .totalAmount(new BigDecimal("150.00"))
                .createdAt(LocalDateTime.now())
                .build();
        saleToday.addItem(SaleItem.builder()
                .product(prod)
                .productName(prod.getName())
                .unitPrice(prod.getPrice())
                .quantity(3)
                .subtotal(new BigDecimal("150.00"))
                .build());
        saleRepository.save(saleToday);

        MvcResult result = mockMvc.perform(get("/api/analytics/revenue-trend?period=last7days")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<DailyRevenueTrend> trend = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(7, trend.size());

        // The last item corresponds to today
        DailyRevenueTrend todayEntry = trend.get(trend.size() - 1);
        assertEquals(LocalDate.now().toString(), todayEntry.getDate());
        assertEquals(new BigDecimal("150.00"), todayEntry.getRevenue());
        assertEquals(1L, todayEntry.getTransactionCount());
        assertEquals(3L, todayEntry.getItemsSold());

        // Previous days have 0
        DailyRevenueTrend yesterdayEntry = trend.get(trend.size() - 2);
        assertEquals(new BigDecimal("0.00"), yesterdayEntry.getRevenue());
        assertEquals(0L, yesterdayEntry.getTransactionCount());
        assertEquals(0L, yesterdayEntry.getItemsSold());
    }
}
