-- Create user_profile table (singular) for storing user profile information
-- This table will store additional user information beyond what's in auth

-- Create the user_profile table
CREATE TABLE IF NOT EXISTS user_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL, -- This should match the user's UUID from your auth system
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile(email);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample user profiles (optional)
INSERT INTO user_profile (user_id, name, email, role) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'John Admin', 'admin@example.com', 'admin'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Jane User', 'user@example.com', 'user'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Bob Support', 'support@example.com', 'support')
ON CONFLICT (user_id) DO NOTHING;

-- Show the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profile' 
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM user_profile LIMIT 5;

SELECT 'user_profile table created successfully!' as status;
