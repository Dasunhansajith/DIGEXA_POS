package com.nexshop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.ProductRequest;
import com.nexshop.dto.ProductResponse;
import com.nexshop.model.Product;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.ProductRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
public class MultiTenantProductSecurityTest {

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

        // Ensure Shop A exists
        shopA = shopRepository.findByEmail("shop_a@multitenant.test").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Shop Alpha");
            s.setEmail("shop_a@multitenant.test");
            s.setPhone("0711111111");
            s.setPlan("PRO");
            return shopRepository.save(s);
        });

        // Ensure User A exists
        userA = userRepository.findByEmail("user_a@multitenant.test").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_a@multitenant.test");
            u.setFullName("User Alpha");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopA);
            return userRepository.save(u);
        });

        // Ensure Shop B exists
        shopB = shopRepository.findByEmail("shop_b@multitenant.test").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("Shop Beta");
            s.setEmail("shop_b@multitenant.test");
            s.setPhone("0722222222");
            s.setPlan("FREE");
            return shopRepository.save(s);
        });

        // Ensure User B exists
        userB = userRepository.findByEmail("user_b@multitenant.test").orElseGet(() -> {
            User u = new User();
            u.setEmail("user_b@multitenant.test");
            u.setFullName("User Beta");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("OWNER");
            u.setShop(shopB);
            return userRepository.save(u);
        });

        // Generate verified server-side JWT tokens
        tokenA = jwtService.generateToken(userA.getId(), shopA.getId(), userA.getEmail(), userA.getRole());
        tokenB = jwtService.generateToken(userB.getId(), shopB.getId(), userB.getEmail(), userB.getRole());

        // Clean up test products from previous runs for clean isolated test state
        productRepository.deleteAll(productRepository.findAllByShop_Id(shopA.getId()));
        productRepository.deleteAll(productRepository.findAllByShop_Id(shopB.getId()));
    }

    @Test
    @DisplayName("Shop A cannot list Shop B's products")
    void testShopACannotListShopBProducts() throws Exception {
        // Create Product for Shop A
        Product prodA = productRepository.save(Product.builder()
                .name("Alpha Product")
                .description("Desc A")
                .price(new BigDecimal("15.50"))
                .category("Electronics")
                .stock(10)
                .shop(shopA)
                .build());

        // Create Product for Shop B
        Product prodB = productRepository.save(Product.builder()
                .name("Beta Product")
                .description("Desc B")
                .price(new BigDecimal("25.00"))
                .category("Clothing")
                .stock(5)
                .shop(shopB)
                .build());

        // Shop A lists products
        MvcResult resultA = mockMvc.perform(get("/api/products")
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> productsA = objectMapper.readValue(
                resultA.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(1, productsA.size());
        assertEquals(prodA.getId(), productsA.get(0).getId());
        assertEquals("Alpha Product", productsA.get(0).getName());
        assertEquals(shopA.getId(), productsA.get(0).getShopId());

        // Shop B lists products
        MvcResult resultB = mockMvc.perform(get("/api/products")
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> productsB = objectMapper.readValue(
                resultB.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );

        assertEquals(1, productsB.size());
        assertEquals(prodB.getId(), productsB.get(0).getId());
        assertEquals("Beta Product", productsB.get(0).getName());
        assertEquals(shopB.getId(), productsB.get(0).getShopId());
    }

    @Test
    @DisplayName("Shop A cannot search Shop B's products")
    void testShopACannotSearchShopBProducts() throws Exception {
        // Both shops have a product matching "Universal"
        productRepository.save(Product.builder()
                .name("Universal Alpha Adapter")
                .price(new BigDecimal("12.00"))
                .category("Accessories")
                .shop(shopA)
                .build());

        productRepository.save(Product.builder()
                .name("Universal Beta Cable")
                .price(new BigDecimal("8.00"))
                .category("Accessories")
                .shop(shopB)
                .build());

        // Shop A searches "Universal"
        MvcResult resultA = mockMvc.perform(get("/api/products?search=Universal")
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> listA = objectMapper.readValue(
                resultA.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );
        assertEquals(1, listA.size());
        assertEquals("Universal Alpha Adapter", listA.get(0).getName());

        // Shop B searches "Universal"
        MvcResult resultB = mockMvc.perform(get("/api/products?search=Universal")
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> listB = objectMapper.readValue(
                resultB.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );
        assertEquals(1, listB.size());
        assertEquals("Universal Beta Cable", listB.get(0).getName());
    }

    @Test
    @DisplayName("Shop A cannot filter by category and see Shop B's products")
    void testShopACannotFilterByCategoryShopBProducts() throws Exception {
        // Both shops have products in category "Groceries"
        productRepository.save(Product.builder()
                .name("Alpha Apples")
                .price(new BigDecimal("3.00"))
                .category("Groceries")
                .shop(shopA)
                .build());

        productRepository.save(Product.builder()
                .name("Beta Bread")
                .price(new BigDecimal("2.50"))
                .category("Groceries")
                .shop(shopB)
                .build());

        // Shop A filters by category "Groceries"
        MvcResult resultA = mockMvc.perform(get("/api/products?category=Groceries")
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> listA = objectMapper.readValue(
                resultA.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );
        assertEquals(1, listA.size());
        assertEquals("Alpha Apples", listA.get(0).getName());

        // Shop B filters by category "Groceries"
        MvcResult resultB = mockMvc.perform(get("/api/products?category=Groceries")
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        List<ProductResponse> listB = objectMapper.readValue(
                resultB.getResponse().getContentAsString(),
                new TypeReference<>() {}
        );
        assertEquals(1, listB.size());
        assertEquals("Beta Bread", listB.get(0).getName());
    }

    @Test
    @DisplayName("Shop A cannot view Shop B's product by ID (returns 404)")
    void testShopACannotViewShopBProductById() throws Exception {
        Product prodB = productRepository.save(Product.builder()
                .name("Confidential Beta Device")
                .price(new BigDecimal("999.00"))
                .category("Special")
                .shop(shopB)
                .build());

        // Shop A requests Shop B's product ID -> 404 Not Found (without leaking existence)
        mockMvc.perform(get("/api/products/" + prodB.getId())
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound());

        // Shop B requests its own product -> 200 OK
        mockMvc.perform(get("/api/products/" + prodB.getId())
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(prodB.getId()))
                .andExpect(jsonPath("$.name").value("Confidential Beta Device"))
                .andExpect(jsonPath("$.shopId").value(shopB.getId()));
    }

    @Test
    @DisplayName("Shop A cannot update Shop B's product (returns 404 and does not mutate)")
    void testShopACannotUpdateShopBProduct() throws Exception {
        Product prodB = productRepository.save(Product.builder()
                .name("Original Beta Name")
                .description("Original Desc")
                .price(new BigDecimal("50.00"))
                .category("Gadgets")
                .stock(10)
                .shop(shopB)
                .build());

        ProductRequest maliciousUpdate = ProductRequest.builder()
                .name("Maliciously Hijacked Name")
                .description("Hacked Desc")
                .price(new BigDecimal("1.00"))
                .category("Hacked")
                .stock(0)
                .build();

        // Shop A attempts to update Shop B's product -> 404 Not Found
        mockMvc.perform(put("/api/products/" + prodB.getId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maliciousUpdate)))
                .andExpect(status().isNotFound());

        // Verify product in database remains completely unchanged
        Product reloadedB = productRepository.findById(prodB.getId()).orElseThrow();
        assertEquals("Original Beta Name", reloadedB.getName());
        assertEquals("Original Desc", reloadedB.getDescription());
        assertEquals(0, new BigDecimal("50.00").compareTo(reloadedB.getPrice()));
        assertEquals(shopB.getId(), reloadedB.getShop().getId());
    }

    @Test
    @DisplayName("Shop A cannot delete Shop B's product (returns 404 and does not delete)")
    void testShopACannotDeleteShopBProduct() throws Exception {
        Product prodB = productRepository.save(Product.builder()
                .name("Protected Beta Product")
                .price(new BigDecimal("100.00"))
                .shop(shopB)
                .build());

        // Shop A attempts to delete Shop B's product -> 404 Not Found
        mockMvc.perform(delete("/api/products/" + prodB.getId())
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound());

        // Verify product STILL exists in database
        assertTrue(productRepository.existsById(prodB.getId()));

        // Shop B deletes its own product -> 204 No Content
        mockMvc.perform(delete("/api/products/" + prodB.getId())
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNoContent());

        // Verify product is now deleted
        assertFalse(productRepository.existsById(prodB.getId()));
    }

    @Test
    @DisplayName("Creating product ignores any client-provided shopId and assigns authenticated user's shop")
    void testCreateProductCannotAssignToAnotherShop() throws Exception {
        // Craft payload attempting to specify shopId of Shop B and product ID 9999
        Map<String, Object> maliciousPayload = new HashMap<>();
        maliciousPayload.put("id", 9999L);
        maliciousPayload.put("name", "New Alpha Item");
        maliciousPayload.put("description", "Desc");
        maliciousPayload.put("price", 45.00);
        maliciousPayload.put("category", "General");
        maliciousPayload.put("stock", 20);
        maliciousPayload.put("shopId", shopB.getId()); // Attacker tries to create under Shop B
        maliciousPayload.put("shop", Map.of("id", shopB.getId()));

        MvcResult result = mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maliciousPayload)))
                .andExpect(status().isCreated())
                .andReturn();

        ProductResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                ProductResponse.class
        );

        assertNotNull(response.getId());
        assertNotEquals(9999L, response.getId()); // Server generated ID used
        assertEquals("New Alpha Item", response.getName());
        assertEquals(shopA.getId(), response.getShopId()); // Assigned strictly to Shop A!

        // Verify in database that shop is Shop A, NOT Shop B
        Product saved = productRepository.findById(response.getId()).orElseThrow();
        assertEquals(shopA.getId(), saved.getShop().getId());
        assertNotEquals(shopB.getId(), saved.getShop().getId());
    }

    @Test
    @DisplayName("Updating product cannot reassign shop ownership to another shop")
    void testUpdateProductCannotAssignToAnotherShop() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Alpha Original")
                .price(new BigDecimal("30.00"))
                .shop(shopA)
                .build());

        // Shop A attempts to transfer product to Shop B via update body
        Map<String, Object> maliciousPayload = new HashMap<>();
        maliciousPayload.put("name", "Alpha Modified");
        maliciousPayload.put("price", 35.00);
        maliciousPayload.put("shopId", shopB.getId()); // Attempt to switch shop
        maliciousPayload.put("shop", Map.of("id", shopB.getId()));

        mockMvc.perform(put("/api/products/" + prodA.getId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maliciousPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha Modified"))
                .andExpect(jsonPath("$.shopId").value(shopA.getId()));

        // Verify in database: shop is STILL Shop A
        Product updated = productRepository.findById(prodA.getId()).orElseThrow();
        assertEquals("Alpha Modified", updated.getName());
        assertEquals(shopA.getId(), updated.getShop().getId());
        assertNotEquals(shopB.getId(), updated.getShop().getId());
    }

    @Test
    @DisplayName("Product response does not expose sensitive Shop or User entities")
    void testProductResponseDoesNotExposeSensitiveEntities() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Safe Response Product")
                .price(new BigDecimal("19.99"))
                .shop(shopA)
                .build());

        MvcResult result = mockMvc.perform(get("/api/products/" + prodA.getId())
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        String content = result.getResponse().getContentAsString();
        Map<?, ?> json = objectMapper.readValue(content, Map.class);

        // Verify safe fields exist
        assertTrue(json.containsKey("id"));
        assertTrue(json.containsKey("name"));
        assertTrue(json.containsKey("price"));
        assertTrue(json.containsKey("shopId"));

        // Verify sensitive entity objects are NOT exposed
        assertFalse(json.containsKey("shop")); // No nested Shop entity
        assertFalse(json.containsKey("user")); // No User entity
        assertFalse(json.containsKey("passwordHash"));
        assertFalse(content.contains(shopA.getEmail())); // Shop email is not leaked
        assertFalse(content.contains(shopA.getPhone())); // Shop phone is not leaked
    }

    @Test
    @DisplayName("Unauthenticated requests to /api/products are rejected with 401")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Validation constraints reject invalid product payload")
    void testValidationRejectsInvalidProduct() throws Exception {
        // Missing name and negative price
        Map<String, Object> invalidPayload = new HashMap<>();
        invalidPayload.put("name", "");
        invalidPayload.put("price", -10.00);

        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidPayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.price").exists());
    }

    @Test
    @DisplayName("CORS preflight OPTIONS /api/products is permitted for frontend origins without 401")
    void testCorsPreflightOptionsAllowed() throws Exception {
        mockMvc.perform(options("/api/products")
                .header("Origin", "http://localhost:5174")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    @Test
    @DisplayName("Authenticated owner can successfully create product returning 201 Created")
    void testAuthenticatedOwnerCanCreateProductSuccessfully() throws Exception {
        ProductRequest validRequest = ProductRequest.builder()
                .name("Organic Green Tea")
                .description("Freshly packaged high-grade green tea")
                .price(new BigDecimal("14.99"))
                .category("Beverages")
                .stock(50)
                .imageUrl("https://images.unsplash.com/photo-greentea")
                .build();

        MvcResult result = mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Organic Green Tea"))
                .andExpect(jsonPath("$.price").value(14.99))
                .andExpect(jsonPath("$.stock").value(50))
                .andExpect(jsonPath("$.shopId").value(shopA.getId()))
                .andReturn();

        ProductResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                ProductResponse.class
        );

        assertNotNull(response.getId());
        assertTrue(productRepository.existsById(response.getId()));
    }
}

