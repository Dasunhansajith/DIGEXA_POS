-- =============================================================================
-- Migration: V2__create_products.sql
-- Description: Create products table with foreign key to shops
-- =============================================================================

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    price NUMERIC(38, 2) NOT NULL,
    category VARCHAR(255),
    image_url VARCHAR(255),
    stock INTEGER DEFAULT 0,
    shop_id BIGINT NOT NULL,
    CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

CREATE INDEX idx_products_shop_id ON products (shop_id);

