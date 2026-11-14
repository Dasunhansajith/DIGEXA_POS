-- =============================================================================
-- Migration: V3__create_sales_and_sale_items.sql
-- Description: Create sales and sale_items tables with multi-tenant shop foreign keys
-- =============================================================================

CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(255),
    shop_id BIGINT NOT NULL,
    cashier_id BIGINT NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    subtotal NUMERIC(38, 2) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'NONE',
    discount_value NUMERIC(38, 2) DEFAULT 0.00,
    discount_amount NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(38, 2) NOT NULL,
    amount_tendered NUMERIC(38, 2),
    change_amount NUMERIC(38, 2) DEFAULT 0.00,
    notes VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_cashier FOREIGN KEY (cashier_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX idx_sales_shop_id ON sales (shop_id);
CREATE INDEX idx_sales_created_at ON sales (created_at DESC);
CREATE UNIQUE INDEX idx_sales_shop_idempotency ON sales (shop_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(38, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(38, 2) NOT NULL,
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
);

CREATE INDEX idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items (product_id);

