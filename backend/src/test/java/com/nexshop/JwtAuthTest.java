package com.nexshop;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexshop.dto.LoginRequest;
import com.nexshop.model.Shop;
import com.nexshop.model.User;
import com.nexshop.repository.ShopRepository;
import com.nexshop.repository.UserRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
public class JwtAuthTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private Filter springSecurityFilterChain;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    private String testUserEmail = "testuser_auth@example.com";
    private String testUserPassword = "Password123!";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .addFilters(springSecurityFilterChain)
                .build();

        if (userRepository.findByEmail(testUserEmail).isEmpty()) {
            Shop shop = shopRepository.findById(1L).orElseGet(() -> {
                Shop newShop = new Shop();
                newShop.setName("Test Shop");
                newShop.setPhone("0771234567");
                return shopRepository.save(newShop);
            });

            User user = new User();
            user.setEmail(testUserEmail);
            user.setFullName("Test User");
            user.setPasswordHash(passwordEncoder.encode(testUserPassword));
            user.setRole("OWNER");
            user.setShop(shop);
            userRepository.save(user);
        }
    }

    @Test
    void testLoginAndGetTestEndpoint() throws Exception {
        // 1. Unauthenticated request to /api/test
        MvcResult unauthResult = mockMvc.perform(get("/api/test"))
                .andReturn();
        System.out.println("=== UNAUTHENTICATED /api/test STATUS: " + unauthResult.getResponse().getStatus());
        System.out.println("=== UNAUTHENTICATED /api/test BODY: " + unauthResult.getResponse().getContentAsString());

        // 2. Perform Login
        LoginRequest loginRequest = new LoginRequest(testUserEmail, testUserPassword);
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andReturn();

        System.out.println("=== LOGIN STATUS: " + loginResult.getResponse().getStatus());
        System.out.println("=== LOGIN BODY: " + loginResult.getResponse().getContentAsString());
        assertEquals(200, loginResult.getResponse().getStatus());

        Map<?, ?> responseMap = objectMapper.readValue(loginResult.getResponse().getContentAsString(), Map.class);
        String accessToken = (String) responseMap.get("accessToken");
        assertNotNull(accessToken);
        System.out.println("=== TOKEN OBTAINED");

        // 3. Make authenticated request to /api/test
        MvcResult authResult = mockMvc.perform(get("/api/test")
                .header("Authorization", "Bearer " + accessToken))
                .andReturn();

        System.out.println("=== AUTHENTICATED /api/test STATUS: " + authResult.getResponse().getStatus());
        System.out.println("=== AUTHENTICATED /api/test BODY: " + authResult.getResponse().getContentAsString());
    }
}
