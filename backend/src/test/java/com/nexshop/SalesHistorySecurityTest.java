package com.nexshop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.PageResponse;
import com.nexshop.dto.SaleItemRequest;
import com.nexshop.dto.SaleRequest;
import com.nexshop.dto.SaleResponse;
import com.nexshop.dto.SalesSummaryResponse;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class SalesHistorySecurityTest {

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
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

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
        shopA = shopRepository.findByEmail("history_a@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("History Shop Alpha");
            s.setEmail("history_a@test.com");
            s.setPhone("0719999991");
            s.setPlan("PRO");
            return shopRepository.save(s);
        });

        // 2. Setup isolated test User A
        userA = userRepository.findByEmail("history_user_a@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("history_user_a@test.com");
            u.setFullName("History Alpha Cashier");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("CASHIER");
            u.setShop(shopA);
            return userRepository.save(u);
        });

        // 3. Setup isolated test Shop B
        shopB = shopRepository.findByEmail("history_b@test.com").orElseGet(() -> {
            Shop s = new Shop();
            s.setName("History Shop Beta");
            s.setEmail("history_b@test.com");
            s.setPhone("0719999992");
            s.setPlan("FREE");
            return shopRepository.save(s);
        });

        // 4. Setup isolated test User B
        userB = userRepository.findByEmail("history_user_b@test.com").orElseGet(() -> {
            User u = new User();
            u.setEmail("history_user_b@test.com");
            u.setFullName("History Beta Cashier");
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setRole("CASHIER");
            u.setShop(shopB);
            return userRepository.save(u);
        });

        // 5. Generate verified JWT tokens
        tokenA = jwtService.generateToken(userA.getId(), shopA.getId(), userA.getEmail(), userA.getRole());
        tokenB = jwtService.generateToken(userB.getId(), shopB.getId(), userB.getEmail(), userB.getRole());

        // Clean any leftovers
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

    private SaleResponse createSaleViaApi(String token, Product prod, int qty, String paymentMethod, String customerName, String customerPhone) throws Exception {
        SaleRequest request = SaleRequest.builder()
                .items(List.of(
                        SaleItemRequest.builder()
                                .productId(prod.getId())
                                .quantity(qty)
                                .build()
                ))
                .paymentMethod(paymentMethod)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .amountTendered(paymentMethod.equals("CASH") ? new BigDecimal("10000.00") : null)
                .build();

        MvcResult result = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), SaleResponse.class);
    }

    @Test
    @DisplayName("Unauthenticated requests to Sales endpoints return 401 Unauthorized")
    void testUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/sales"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/sales?page=0&size=20"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/sales/summary"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/sales/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Strict multi-tenant isolation on Sales list, summary, and details")
    void testStrictTenantIsolation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Alpha Product")
                .price(new BigDecimal("250.00"))
                .stock(50)
                .shop(shopA)
                .build());

        SaleResponse saleA = createSaleViaApi(tokenA, prodA, 2, "CASH", "Kasun Fernando", "0771112233");

        // Shop B attempts to view sales list with pagination -> 0 elements
        MvcResult listBResult = mockMvc.perform(get("/api/sales?page=0&size=10")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        PageResponse<SaleResponse> pageB = objectMapper.readValue(
                listBResult.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(0, pageB.getTotalElements());
        assertTrue(pageB.getContent().isEmpty());

        // Shop B attempts to view Shop A's sale by ID -> 404 Not Found (no leakage)
        mockMvc.perform(get("/api/sales/" + saleA.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Shop B summary -> 0 sales, 0 revenue
        MvcResult summaryBResult = mockMvc.perform(get("/api/sales/summary")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andReturn();

        SalesSummaryResponse summaryB = objectMapper.readValue(
                summaryBResult.getResponse().getContentAsString(), SalesSummaryResponse.class);
        assertEquals(0L, summaryB.getTotalSales());
        assertEquals(new BigDecimal("0.00"), summaryB.getTotalRevenue());
    }

    @Test
    @DisplayName("Pagination and metadata calculations")
    void testPaginationAndMetadata() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Batch Item")
                .price(new BigDecimal("100.00"))
                .stock(100)
                .shop(shopA)
                .build());

        for (int i = 1; i <= 5; i++) {
            createSaleViaApi(tokenA, prodA, 1, "CASH", "Customer " + i, "077000000" + i);
        }

        // Page 0 with size 2
        MvcResult res0 = mockMvc.perform(get("/api/sales?page=0&size=2")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> page0 = objectMapper.readValue(
                res0.getResponse().getContentAsString(), new TypeReference<>() {});

        assertEquals(0, page0.getPage());
        assertEquals(2, page0.getSize());
        assertEquals(5L, page0.getTotalElements());
        assertEquals(3, page0.getTotalPages());
        assertEquals(2, page0.getContent().size());

        // Page 2 (last page)
        MvcResult res2 = mockMvc.perform(get("/api/sales?page=2&size=2")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> page2 = objectMapper.readValue(
                res2.getResponse().getContentAsString(), new TypeReference<>() {});

        assertEquals(2, page2.getPage());
        assertEquals(1, page2.getContent().size());
    }

    @Test
    @DisplayName("Default sorting: Newest sale first")
    void testDefaultOrderingNewestFirst() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Chronological Item")
                .price(new BigDecimal("150.00"))
                .stock(50)
                .shop(shopA)
                .build());

        SaleResponse sale1 = createSaleViaApi(tokenA, prodA, 1, "CASH", "Oldest Buyer", "0711111111");
        Thread.sleep(50); // slight pause to ensure distinct timestamp
        SaleResponse sale2 = createSaleViaApi(tokenA, prodA, 1, "CASH", "Newest Buyer", "0722222222");

        MvcResult res = mockMvc.perform(get("/api/sales?page=0&size=10")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        PageResponse<SaleResponse> page = objectMapper.readValue(
                res.getResponse().getContentAsString(), new TypeReference<>() {});

        assertEquals(2, page.getContent().size());
        assertEquals(sale2.getId(), page.getContent().get(0).getId(), "Newest sale must appear first");
        assertEquals(sale1.getId(), page.getContent().get(1).getId());
    }

    @Test
    @DisplayName("Search by receipt number, customer name, and customer phone")
    void testSearchCapabilities() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Searchable Item")
                .price(new BigDecimal("200.00"))
                .stock(50)
                .shop(shopA)
                .build());

        SaleResponse sale1 = createSaleViaApi(tokenA, prodA, 1, "CASH", "Sunil Perera", "0771234567");
        SaleResponse sale2 = createSaleViaApi(tokenA, prodA, 1, "CARD", "Kamal Silva", "0719876543");

        // 1. Search by receipt number
        MvcResult resReceipt = mockMvc.perform(get("/api/sales?query=" + sale1.getReceiptNumber())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pReceipt = objectMapper.readValue(
                resReceipt.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, pReceipt.getTotalElements());
        assertEquals(sale1.getReceiptNumber(), pReceipt.getContent().get(0).getReceiptNumber());

        // 2. Search by customer name (case-insensitive substring)
        MvcResult resName = mockMvc.perform(get("/api/sales?query=silva")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pName = objectMapper.readValue(
                resName.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, pName.getTotalElements());
        assertEquals("Kamal Silva", pName.getContent().get(0).getCustomerName());

        // 3. Search by customer phone
        MvcResult resPhone = mockMvc.perform(get("/api/sales?query=077123")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pPhone = objectMapper.readValue(
                resPhone.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1, pPhone.getTotalElements());
        assertEquals("Sunil Perera", pPhone.getContent().get(0).getCustomerName());
    }

    @Test
    @DisplayName("Date range filtering and validation")
    void testDateRangeFilteringAndValidation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Dated Item")
                .price(new BigDecimal("120.00"))
                .stock(50)
                .shop(shopA)
                .build());

        createSaleViaApi(tokenA, prodA, 1, "CASH", "Today Customer", "0771111111");

        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String tomorrow = LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE);

        // Valid date range including today
        MvcResult resValid = mockMvc.perform(get("/api/sales?startDate=" + today + "&endDate=" + today)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pValid = objectMapper.readValue(
                resValid.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1L, pValid.getTotalElements());

        // Past date range returning 0
        MvcResult resPast = mockMvc.perform(get("/api/sales?startDate=" + yesterday + "&endDate=" + yesterday)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pPast = objectMapper.readValue(
                resPast.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(0L, pPast.getTotalElements());

        // Invalid date range (startDate > endDate) -> 400 Bad Request
        mockMvc.perform(get("/api/sales?startDate=" + tomorrow + "&endDate=" + yesterday)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());

        // Malformed date -> 400 Bad Request
        mockMvc.perform(get("/api/sales?startDate=not-a-date")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Payment method and status filtering")
    void testPaymentMethodAndStatusFiltering() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Payment Item")
                .price(new BigDecimal("300.00"))
                .stock(50)
                .shop(shopA)
                .build());

        createSaleViaApi(tokenA, prodA, 1, "CASH", "Cash Customer", "0771111111");
        createSaleViaApi(tokenA, prodA, 1, "CARD", "Card Customer", "0772222222");

        // Filter CASH
        MvcResult resCash = mockMvc.perform(get("/api/sales?paymentMethod=CASH")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pCash = objectMapper.readValue(
                resCash.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1L, pCash.getTotalElements());
        assertEquals("CASH", pCash.getContent().get(0).getPaymentMethod());

        // Filter CARD
        MvcResult resCard = mockMvc.perform(get("/api/sales?paymentMethod=CARD")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pCard = objectMapper.readValue(
                resCard.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(1L, pCard.getTotalElements());
        assertEquals("CARD", pCard.getContent().get(0).getPaymentMethod());

        // Filter Status COMPLETED
        MvcResult resStatus = mockMvc.perform(get("/api/sales?status=COMPLETED")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pStatus = objectMapper.readValue(
                resStatus.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(2L, pStatus.getTotalElements());

        // Invalid paymentMethod -> 400
        mockMvc.perform(get("/api/sales?paymentMethod=BITCOIN")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());

        // Invalid status -> 400
        mockMvc.perform(get("/api/sales?status=CANCELLED")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Sale details GET /api/sales/{id} exposes all receipt details and line items")
    void testSaleDetailsExposesReceiptInformation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Detailed Item")
                .price(new BigDecimal("450.00"))
                .stock(50)
                .shop(shopA)
                .build());

        SaleResponse created = createSaleViaApi(tokenA, prodA, 3, "CASH", "Anura Kumara", "0773334444");

        MvcResult result = mockMvc.perform(get("/api/sales/" + created.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        SaleResponse details = objectMapper.readValue(result.getResponse().getContentAsString(), SaleResponse.class);

        assertEquals(created.getReceiptNumber(), details.getReceiptNumber());
        assertEquals("History Alpha Cashier", details.getCashierName());
        assertEquals("Anura Kumara", details.getCustomerName());
        assertEquals("0773334444", details.getCustomerPhone());
        assertEquals("CASH", details.getPaymentMethod());
        assertEquals("COMPLETED", details.getStatus());
        assertEquals(3, details.getItemCount());
        assertNotNull(details.getCreatedAt());

        // Line items verification
        assertEquals(1, details.getItems().size());
        assertEquals("Detailed Item", details.getItems().get(0).getProductName());
        assertEquals(3, details.getItems().get(0).getQuantity());
        assertEquals(new BigDecimal("450.00"), details.getItems().get(0).getUnitPrice());
        assertEquals(new BigDecimal("1350.00"), details.getItems().get(0).getSubtotal());
    }

    @Test
    @DisplayName("Sales summary calculation: totalSales, totalRevenue, and averageSale")
    void testSalesSummaryCalculation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Summary Item")
                .price(new BigDecimal("500.00"))
                .stock(50)
                .shop(shopA)
                .build());

        createSaleViaApi(tokenA, prodA, 1, "CASH", "Client 1", "0770000001"); // 500.00
        createSaleViaApi(tokenA, prodA, 3, "CARD", "Client 2", "0770000002"); // 1500.00

        // Summary without filters
        MvcResult summaryResult = mockMvc.perform(get("/api/sales/summary")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        SalesSummaryResponse summary = objectMapper.readValue(
                summaryResult.getResponse().getContentAsString(), SalesSummaryResponse.class);

        assertEquals(2L, summary.getTotalSales());
        assertEquals(new BigDecimal("2000.00"), summary.getTotalRevenue());
        assertEquals(new BigDecimal("1000.00"), summary.getAverageSale());

        // Summary with filter: paymentMethod=CARD
        MvcResult cardSummaryRes = mockMvc.perform(get("/api/sales/summary?paymentMethod=CARD")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();

        SalesSummaryResponse cardSummary = objectMapper.readValue(
                cardSummaryRes.getResponse().getContentAsString(), SalesSummaryResponse.class);

        assertEquals(1L, cardSummary.getTotalSales());
        assertEquals(new BigDecimal("1500.00"), cardSummary.getTotalRevenue());
        assertEquals(new BigDecimal("1500.00"), cardSummary.getAverageSale());
    }

    @Test
    @DisplayName("Custom sorting on totalAmount and validation of invalid sort fields")
    void testCustomSortingAndValidation() throws Exception {
        Product prodA = productRepository.save(Product.builder()
                .name("Tiered Item")
                .price(new BigDecimal("100.00"))
                .stock(50)
                .shop(shopA)
                .build());

        createSaleViaApi(tokenA, prodA, 1, "CASH", "Small Buyer", "0771111111"); // 100.00
        createSaleViaApi(tokenA, prodA, 5, "CASH", "Big Buyer", "0772222222");   // 500.00

        // Sort by totalAmount DESC
        MvcResult resDesc = mockMvc.perform(get("/api/sales?sortBy=totalAmount&sortDir=desc")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pDesc = objectMapper.readValue(
                resDesc.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(new BigDecimal("500.00"), pDesc.getContent().get(0).getTotalAmount());
        assertEquals(new BigDecimal("100.00"), pDesc.getContent().get(1).getTotalAmount());

        // Sort by totalAmount ASC
        MvcResult resAsc = mockMvc.perform(get("/api/sales?sortBy=totalAmount&sortDir=asc")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        PageResponse<SaleResponse> pAsc = objectMapper.readValue(
                resAsc.getResponse().getContentAsString(), new TypeReference<>() {});
        assertEquals(new BigDecimal("100.00"), pAsc.getContent().get(0).getTotalAmount());
        assertEquals(new BigDecimal("500.00"), pAsc.getContent().get(1).getTotalAmount());

        // Invalid sortBy -> 400
        mockMvc.perform(get("/api/sales?sortBy=maliciousColumn")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());

        // Invalid sortDir -> 400
        mockMvc.perform(get("/api/sales?sortDir=sideways")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest());
    }
}

