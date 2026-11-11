package com.nexshop.security;

import com.nexshop.model.User;
import com.nexshop.repository.UserRepository;
import com.nexshop.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Autowired
    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // 1. Missing or non-Bearer Authorization header: leave unauthenticated
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7).trim();

        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 2. Validate JWT signature and expiration
            if (!jwtService.isTokenValid(token)) {
                log.warn("JWT token validation failed for URI: {}", request.getRequestURI());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 3. Extract claims from validated token
            Long tokenUserId = jwtService.extractUserId(token);
            String tokenEmail = jwtService.extractEmail(token);
            Long tokenShopId = jwtService.extractShopId(token);
            String tokenRole = jwtService.extractRole(token);

            if (tokenUserId == null || tokenEmail == null) {
                log.warn("JWT token missing userId or email claim for URI: {}", request.getRequestURI());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 4. Load user from database using UserRepository.findById()
            Optional<User> optionalUser = userRepository.findById(tokenUserId);
            if (optionalUser.isEmpty()) {
                log.warn("User not found in database for userId: {}", tokenUserId);
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            User user = optionalUser.get();
            Long userShopId = user.getShop() != null ? user.getShop().getId() : null;

            // 5. Verify that token's email, shopId, and role match current database user
            boolean emailMatches = tokenEmail.equalsIgnoreCase(user.getEmail());
            boolean shopIdMatches = Objects.equals(tokenShopId, userShopId);
            boolean roleMatches = Objects.equals(tokenRole, user.getRole());

            if (!emailMatches || !shopIdMatches || !roleMatches) {
                log.warn("JWT claims mismatch for userId {}: emailMatch={}, shopMatch={}, roleMatch={}",
                        tokenUserId, emailMatches, shopIdMatches, roleMatches);
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 6. Build authority with "ROLE_" + database user's role
            String roleWithPrefix = user.getRole().startsWith("ROLE_")
                    ? user.getRole()
                    : "ROLE_" + user.getRole();
            List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(roleWithPrefix));

            // 7. Create UsernamePasswordAuthenticationToken using database user as principal
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    authorities
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // 8. Set authentication in SecurityContextHolder
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            log.debug("Authentication successfully set in SecurityContext for userId: {}, role: {}", tokenUserId, roleWithPrefix);

        } catch (Exception ex) {
            log.error("Authentication processing error for URI {}: {}", request.getRequestURI(), ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
