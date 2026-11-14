package com.nexshop.model;

public enum AdjustmentReason {
    STOCK_RECEIVED,
    DAMAGED,
    EXPIRED,
    MANUAL_CORRECTION;

    public static boolean isValid(String reason) {
        if (reason == null) return false;
        try {
            valueOf(reason.trim().toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}

