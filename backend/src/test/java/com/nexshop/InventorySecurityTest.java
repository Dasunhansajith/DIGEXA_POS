package com.nexshop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.InventoryAdjustmentResponse;
import com.nexshop.dto.InventoryOverviewResponse;
import com.nexshop.dto.InventoryProductResponse;
import com.nexshop.dto.StockAdjustmentRequest;
import com.nexshop.dto.UpdateThresholdRequest;
import com.nexshop.model.InventoryStatus;
import com.nexshop.model.Product;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.InventoryAdjustmentRepository;
import com.nexshop.repository.ProductRepository;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class InventorySecurityTest {

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
    private InventoryAdjustmentRepository inventoryAdjustmentRepository;

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
        shopA = shopRepository.findByEmail("inventory_a@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Inventory Shop Alpha");
            s.setEmail("inventory_a@test.com");
            s.setPhone("0711111111");
            s.setPlan("PRO");
            return shopRepository.save(s);
        });

        // 2. Setup isolated test User A
        userA = userRepository.findByEmail("inventory_user_a@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("inventory_user_a@test.com");
            u.setFullName("Inventory Alpha");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopA);
            return userRepository.save(u);
        });

        // 3. Setup isolated test Shop B
        shopB = shopRepository.findByEmail("inventory_b@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Inventory Shop Beta");
            s.setEmail("inventory_b@test.com");
            s.setPhone("0722222222");
            s.setPlan("FREE");
            return shopRepository.save(s);
        });

        // 4. Setup isolated test User B
        userB = userRepository.findByEmail("inventory_user_b@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("inventory_user_b@test.com");
            u.setFullName("Inventory Beta");
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
            inventoryAdjustmentRepository.deleteAll(inventoryAdjustmentRepository.findAllByShop_IdOrderByCreatedAtDesc(shopA.getId()));
            productRepository.deleteAll(productRepository.findAllByShop_Id(shopA.getId()));
        }
        if (shopB != null && shopB.getId() != null) {
            inventoryAdjustmentRepository.deleteAll(inventoryAdjustmentRepository.findAllByShop_IdOrderByCreatedAtDesc(shopB.getId()));
            productRepository.deleteAll(productRepository.findAllByShop_Id(shopB.getId()));
        }
    }

    private Product createProduct(String name, String category, int stock, int lowStockThreshold, Shop shop) {
        Product product = Product.builder()
                .name(name)
                .category(category)
                .price(new BigDecimal("150.00"))
                .stock(stock)
                .lowStockThreshold(lowStockThreshold)
                .shop(shop)
                .build();
        return productRepository.save(product);
    }

    @Test
    @DisplayName("Unauthenticated requests to /api/inventory endpoints return 401 Unauthorized")
    void testUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/inventory/overview"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/inventory/products"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/inventory/products/1/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adjustment\": 5, \"reason\": \"STOCK_RECEIVED\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/inventory/products/1/threshold")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lowStockThreshold\": 10}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/inventory/adjustments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Overview metrics calculation and server-side status derivations")
    void testOverviewMetrics() throws Exception {
        // Product 1: stock 20, threshold 5 -> IN_STOCK
        createProduct("Product In Stock", "Electronics", 20, 5, shopA);
        // Product 2: stock 4, threshold 5 -> LOW_STOCK
        createProduct("Product Low Stock", "Electronics", 4, 5, shopA);
        // Product 3: stock 0, threshold 5 -> OUT_OF_STOCK
        createProduct("Product Out Stock", "Groceries", 0, 5, shopA);

        MvcResult result = mockMvc.perform(get("/api/inventory/overview")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        InventoryOverviewResponse overview = objectMapper.readValue(
                result.getResponse().getContentAsString(), InventoryOverviewResponse.class);

        assertEquals(3L, overview.getTotalProducts());
        assertEquals(24L, overview.getTotalUnitsInStock());
        assertEquals(1L, overview.getInStockProducts());
        assertEquals(1L, overview.getLowStockProducts());
        assertEquals(1L, overview.getOutOfStockProducts());
    }

    @Test
    @DisplayName("Empty shop inventory overview returns zero counts without errors")
    void testEmptyOverviewReturnsZeros() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/inventory/overview")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        InventoryOverviewResponse overview = objectMapper.readValue(
                result.getResponse().getContentAsString(), InventoryOverviewResponse.class);

        assertEquals(0L, overview.getTotalProducts());
        assertEquals(0L, overview.getTotalUnitsInStock());
        assertEquals(0L, overview.getInStockProducts());
        assertEquals(0L, overview.getLowStockProducts());
        assertEquals(0L, overview.getOutOfStockProducts());
    }

    @Test
    @DisplayName("Filter products by inventory status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK) and search")
    void testFilterProductsByStatusAndSearch() throws Exception {
        createProduct("Apple iPhone", "Electronics", 15, 5, shopA);
        createProduct("Apple iPad", "Electronics", 3, 5, shopA);
        createProduct("Samsung TV", "Electronics", 0, 5, shopA);

        // Filter: IN_STOCK
        MvcResult resInStock = mockMvc.perform(get("/api/inventory/products")
                        .param("status", "IN_STOCK")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        List<InventoryProductResponse> listInStock = objectMapper.readValue(
                resInStock.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, listInStock.size());
        assertEquals("Apple iPhone", listInStock.get(0).getProductName());
        assertEquals(InventoryStatus.IN_STOCK, listInStock.get(0).getInventoryStatus());

        // Filter: LOW_STOCK
        MvcResult resLowStock = mockMvc.perform(get("/api/inventory/products")
                        .param("status", "LOW_STOCK")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        List<InventoryProductResponse> listLowStock = objectMapper.readValue(
                resLowStock.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, listLowStock.size());
        assertEquals("Apple iPad", listLowStock.get(0).getProductName());
        assertEquals(InventoryStatus.LOW_STOCK, listLowStock.get(0).getInventoryStatus());

        // Filter: OUT_OF_STOCK
        MvcResult resOutOfStock = mockMvc.perform(get("/api/inventory/products")
                        .param("status", "OUT_OF_STOCK")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        List<InventoryProductResponse> listOutOfStock = objectMapper.readValue(
                resOutOfStock.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, listOutOfStock.size());
        assertEquals("Samsung TV", listOutOfStock.get(0).getProductName());
        assertEquals(InventoryStatus.OUT_OF_STOCK, listOutOfStock.get(0).getInventoryStatus());

        // Search query: "Apple"
        MvcResult resSearch = mockMvc.perform(get("/api/inventory/products")
                        .param("query", "apple")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        List<InventoryProductResponse> listSearch = objectMapper.readValue(
                resSearch.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(2, listSearch.size());

        // Invalid status returns 400 Bad Request
        mockMvc.perform(get("/api/inventory/products")
                        .param("status", "NON_EXISTENT_STATUS")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Stock adjustment (+/-) with audit logging")
    void testStockAdjustmentAndAuditTrail() throws Exception {
        Product p = createProduct("Adjustable Widget", "Hardware", 10, 5, shopA);

        // Positive adjustment: +15
        StockAdjustmentRequest addReq = StockAdjustmentRequest.builder()
                .adjustment(15)
                .reason("STOCK_RECEIVED")
                .note("Supplier delivery Batch #101")
                .build();

        MvcResult addResult = mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        InventoryProductResponse addResp = objectMapper.readValue(
                addResult.getResponse().getContentAsString(), InventoryProductResponse.class);
        assertEquals(25, addResp.getStockQuantity());
        assertEquals(InventoryStatus.IN_STOCK, addResp.getInventoryStatus());

        // Negative adjustment: -7
        StockAdjustmentRequest deductReq = StockAdjustmentRequest.builder()
                .adjustment(-7)
                .reason("DAMAGED")
                .note("Broken during handling")
                .build();

        MvcResult deductResult = mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deductReq))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        InventoryProductResponse deductResp = objectMapper.readValue(
                deductResult.getResponse().getContentAsString(), InventoryProductResponse.class);
        assertEquals(18, deductResp.getStockQuantity());

        // Check adjustments audit trail
        MvcResult auditResult = mockMvc.perform(get("/api/inventory/adjustments")
                        .param("productId", p.getId().toString())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<InventoryAdjustmentResponse> adjustments = objectMapper.readValue(
                auditResult.getResponse().getContentAsString(), new TypeReference<>() {});

        assertEquals(2, adjustments.size());
        // Most recent first:
        assertEquals(-7, adjustments.get(0).getAdjustmentQuantity());
        assertEquals(25, adjustments.get(0).getPreviousQuantity());
        assertEquals(18, adjustments.get(0).getNewQuantity());
        assertEquals("DAMAGED", adjustments.get(0).getReason());
        assertEquals("Broken during handling", adjustments.get(0).getNote());
        assertEquals("Inventory Alpha", adjustments.get(0).getUserFullName());

        // First adjustment:
        assertEquals(15, adjustments.get(1).getAdjustmentQuantity());
        assertEquals(10, adjustments.get(1).getPreviousQuantity());
        assertEquals(25, adjustments.get(1).getNewQuantity());
        assertEquals("STOCK_RECEIVED", adjustments.get(1).getReason());
    }

    @Test
    @DisplayName("Stock adjustment cannot result in negative stock (400 Bad Request)")
    void testNegativeStockPrevention() throws Exception {
        Product p = createProduct("Scarce Item", "Hardware", 5, 2, shopA);

        StockAdjustmentRequest overDeduct = StockAdjustmentRequest.builder()
                .adjustment(-10) // 5 - 10 = -5 (illegal)
                .reason("DAMAGED")
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overDeduct))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());

        // Confirm stock is unchanged
        Product reloaded = productRepository.findById(p.getId()).orElseThrow();
        assertEquals(5, reloaded.getStock());

        // Confirm no audit log was created
        List<InventoryAdjustmentResponse> logs = inventoryAdjustmentRepository
                .findAllByShop_IdAndProduct_IdOrderByCreatedAtDesc(shopA.getId(), p.getId())
                .stream().map(InventoryAdjustmentResponse::fromEntity).toList();
        assertTrue(logs.isEmpty());
    }

    @Test
    @DisplayName("Validation rejection on zero adjustment or invalid reason")
    void testInvalidAdjustmentParameters() throws Exception {
        Product p = createProduct("Sample Product", "General", 10, 5, shopA);

        // Zero adjustment
        StockAdjustmentRequest zeroReq = StockAdjustmentRequest.builder()
                .adjustment(0)
                .reason("STOCK_RECEIVED")
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroReq))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());

        // Invalid reason
        StockAdjustmentRequest invalidReasonReq = StockAdjustmentRequest.builder()
                .adjustment(5)
                .reason("NOT_A_VALID_REASON")
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReasonReq))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Update low-stock threshold recalculates status immediately")
    void testUpdateLowStockThreshold() throws Exception {
        // Stock 8, initial threshold 5 -> IN_STOCK
        Product p = createProduct("Threshold Test Product", "Electronics", 8, 5, shopA);

        UpdateThresholdRequest req = UpdateThresholdRequest.builder()
                .lowStockThreshold(10)
                .build();

        MvcResult result = mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/threshold")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        InventoryProductResponse resp = objectMapper.readValue(
                result.getResponse().getContentAsString(), InventoryProductResponse.class);

        assertEquals(10, resp.getLowStockThreshold());
        // Since stock is 8 and threshold is 10, status must now be LOW_STOCK!
        assertEquals(InventoryStatus.LOW_STOCK, resp.getInventoryStatus());

        // Invalid negative threshold returns 400 Bad Request
        UpdateThresholdRequest negativeReq = UpdateThresholdRequest.builder()
                .lowStockThreshold(-1)
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + p.getId() + "/threshold")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negativeReq))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Tenant isolation prevents cross-shop product viewing, adjustments, and audit inspection")
    void testTenantIsolation() throws Exception {
        Product productA = createProduct("Shop A Private Product", "Secret", 15, 5, shopA);

        // Shop B attempts to adjust stock of Shop A's product -> 404 Not Found
        StockAdjustmentRequest adjustReq = StockAdjustmentRequest.builder()
                .adjustment(5)
                .reason("STOCK_RECEIVED")
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + productA.getId() + "/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq))
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Shop B attempts to update threshold of Shop A's product -> 404 Not Found
        UpdateThresholdRequest threshReq = UpdateThresholdRequest.builder()
                .lowStockThreshold(8)
                .build();

        mockMvc.perform(patch("/api/inventory/products/" + productA.getId() + "/threshold")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(threshReq))
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Shop B attempts to inspect adjustments of Shop A's product -> 404 Not Found
        mockMvc.perform(get("/api/inventory/adjustments")
                        .param("productId", productA.getId().toString())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Shop B product list does not contain Shop A's product
        MvcResult listResult = mockMvc.perform(get("/api/inventory/products")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        List<InventoryProductResponse> bProducts = objectMapper.readValue(
                listResult.getResponse().getContentAsString(), new TypeReference<>() {});
        assertTrue(bProducts.isEmpty());
    }
}

