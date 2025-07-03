-- Create user_role table
CREATE TABLE IF NOT EXISTS user_role (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_type table
CREATE TABLE IF NOT EXISTS user_type (
    id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profile table
CREATE TABLE IF NOT EXISTS user_profile (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    other_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    gender VARCHAR(20),
    avatar TEXT,
    "user-name" VARCHAR(100) UNIQUE,
    user_role_id BIGINT REFERENCES user_role(id) ON DELETE SET NULL,
    user_type_id BIGINT REFERENCES user_type(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile(email);
CREATE INDEX IF NOT EXISTS idx_user_profile_username ON user_profile("user-name");
CREATE INDEX IF NOT EXISTS idx_user_profile_role ON user_profile(user_role_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_type ON user_profile(user_type_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_created_at ON user_profile(created_at);

-- Insert sample user roles
INSERT INTO user_role (role_name, description) VALUES
    ('Admin', 'System administrator with full access'),
    ('Manager', 'Manager with limited administrative access'),
    ('User', 'Regular user with basic access'),
    ('Guest', 'Guest user with read-only access')
ON CONFLICT (role_name) DO NOTHING;

-- Insert sample user types
INSERT INTO user_type (type_name, description) VALUES
    ('Customer', 'Regular customer user'),
    ('Staff', 'Staff member'),
    ('Vendor', 'Vendor or supplier'),
    ('Partner', 'Business partner')
ON CONFLICT (type_name) DO NOTHING;

-- Insert sample user profiles
INSERT INTO user_profile (
    first_name, last_name, other_name, email, phone, gender, "user-name", 
    user_role_id, user_type_id
) VALUES
    ('John', 'Doe', 'Michael', 'john.doe@example.com', '+256700123456', 'Male', 'johndoe', 
     (SELECT id FROM user_role WHERE role_name = 'Admin'), 
     (SELECT id FROM user_type WHERE type_name = 'Staff')),
    ('Jane', 'Smith', NULL, 'jane.smith@example.com', '+256700789012', 'Female', 'janesmith', 
     (SELECT id FROM user_role WHERE role_name = 'Manager'), 
     (SELECT id FROM user_type WHERE type_name = 'Staff')),
    ('Robert', 'Johnson', 'William', 'robert.johnson@example.com', '+256700345678', 'Male', 'robertj', 
     (SELECT id FROM user_role WHERE role_name = 'User'), 
     (SELECT id FROM user_type WHERE type_name = 'Customer')),
    ('Sarah', 'Williams', 'Elizabeth', 'sarah.williams@example.com', '+256700901234', 'Female', 'sarahw', 
     (SELECT id FROM user_role WHERE role_name = 'User'), 
     (SELECT id FROM user_type WHERE type_name = 'Customer')),
    ('Michael', 'Brown', 'David', 'michael.brown@example.com', '+256700567890', 'Male', 'michaelb', 
     (SELECT id FROM user_role WHERE role_name = 'Guest'), 
     (SELECT id FROM user_type WHERE type_name = 'Customer'))
ON CONFLICT (email) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_user_role_updated_at ON user_role;
CREATE TRIGGER update_user_role_updated_at 
    BEFORE UPDATE ON user_role 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_type_updated_at ON user_type;
CREATE TRIGGER update_user_type_updated_at 
    BEFORE UPDATE ON user_type 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at 
    BEFORE UPDATE ON user_profile 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_profile TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_role TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_type TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
