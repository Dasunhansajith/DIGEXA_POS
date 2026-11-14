-- =============================================================================
-- Migration: V4__add_low_stock_threshold_and_inventory_adjustments.sql
-- Description: Add low_stock_threshold to products and create inventory_adjustments table
-- =============================================================================

-- 1. Add configurable low_stock_threshold to products table (default 5)
ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;

-- 2. Create inventory_adjustments audit table
CREATE TABLE inventory_adjustments (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    adjustment_quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_adjustments_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 3. Create indexes for performance and multi-tenant scoping
CREATE INDEX idx_inventory_adjustments_shop_id ON inventory_adjustments (shop_id);
CREATE INDEX idx_inventory_adjustments_product_id ON inventory_adjustments (product_id);
CREATE INDEX idx_inventory_adjustments_created_at ON inventory_adjustments (created_at DESC);

