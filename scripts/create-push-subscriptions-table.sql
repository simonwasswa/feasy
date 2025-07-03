-- Create push_subscriptions table for storing web push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique subscription per user and endpoint
    UNIQUE(user_id, endpoint)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Add RLS (Row Level Security) policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own subscriptions
CREATE POLICY "Users can access own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Admins can access all subscriptions
CREATE POLICY "Admins can access all push subscriptions" ON push_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profile 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscriptions for users';
COMMENT ON COLUMN push_subscriptions.user_id IS 'UUID of the user who owns this subscription';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'P256DH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication key for encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether this subscription is currently active';
