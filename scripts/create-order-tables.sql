-- Create order_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status (
    id BIGSERIAL PRIMARY KEY,
    product_unit_id BIGINT,
    order_status_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order table if it doesn't exist
CREATE TABLE IF NOT EXISTS "order" (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    client_id UUID NOT NULL,
    deliveryman_id UUID,
    order_status_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (order_status_id) REFERENCES order_status(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_client_id ON "order"(client_id);
CREATE INDEX IF NOT EXISTS idx_order_deliveryman_id ON "order"(deliveryman_id);
CREATE INDEX IF NOT EXISTS idx_order_status_id ON "order"(order_status_id);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON "order"(created_at);
CREATE INDEX IF NOT EXISTS idx_order_product_id ON "order"(product_id);

-- Insert sample order statuses if table is empty
INSERT INTO order_status (order_status_name, product_unit_id) 
SELECT * FROM (VALUES 
    ('Pending', NULL),
    ('Confirmed', NULL),
    ('Processing', NULL),
    ('Shipped', NULL),
    ('Delivered', NULL),
    ('Completed', NULL),
    ('Cancelled', NULL)
) AS v(order_status_name, product_unit_id)
WHERE NOT EXISTS (SELECT 1 FROM order_status);

-- Insert sample orders if table is empty (optional)
INSERT INTO "order" (product_id, client_id, deliveryman_id, order_status_id)
SELECT * FROM (VALUES 
    (1, '348fe48b-cbc0-437c-ba23-b7e5d8c348ff'::UUID, '6682b5e9-1efd-4148-9ccc-e06622cade8d'::UUID, 1),
    (2, '348fe48b-cbc0-437c-ba23-b7e5d8c348ff'::UUID, NULL, 2),
    (3, '6682b5e9-1efd-4148-9ccc-e06622cade8d'::UUID, '348fe48b-cbc0-437c-ba23-b7e5d8c348ff'::UUID, 3)
) AS v(product_id, client_id, deliveryman_id, order_status_id)
WHERE NOT EXISTS (SELECT 1 FROM "order");

-- Update function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_order_updated_at ON "order";
CREATE TRIGGER update_order_updated_at 
    BEFORE UPDATE ON "order" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_status_updated_at ON order_status;
CREATE TRIGGER update_order_status_updated_at 
    BEFORE UPDATE ON order_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
