package com.nexshop.model;

public enum InventoryStatus {
    IN_STOCK,
    LOW_STOCK,
    OUT_OF_STOCK;

    public static InventoryStatus fromStockAndThreshold(Integer stock, Integer threshold) {
        int s = stock != null ? stock : 0;
        int t = threshold != null ? threshold : 5;
        if (s <= 0) {
            return OUT_OF_STOCK;
        } else if (s <= t) {
            return LOW_STOCK;
        } else {
            return IN_STOCK;
        }
    }
}

