package com.nexshop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopRegistrationResponse {

    private Long shopId;
    private Long ownerId;
    private String shopName;
    private String email;
    private String message;
}

