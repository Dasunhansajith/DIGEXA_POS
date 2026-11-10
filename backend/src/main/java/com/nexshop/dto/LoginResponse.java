package com.nexshop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private Long userId;
    private Long shopId;
    private String fullName;
    private String email;
    private String role;
    private String message;
    private String accessToken;
    private String tokenType;
}
