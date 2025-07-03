-- Check if chat_room table exists and create it if it doesn't
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_room') THEN
        -- Create the chat_room table
        CREATE TABLE chat_room (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE
        );

        -- Create an index on created_by for faster queries
        CREATE INDEX idx_chat_room_created_by ON chat_room(created_by);
        
        -- Create an index on is_active for faster filtering
        CREATE INDEX idx_chat_room_is_active ON chat_room(is_active);

        -- Insert some sample chat rooms for testing
        INSERT INTO chat_room (name, description, created_by) VALUES
        ('General Discussion', 'Main chat room for general conversations', 'system-admin'),
        ('Support', 'Customer support and help desk', 'system-admin'),
        ('Announcements', 'Important announcements and updates', 'system-admin'),
        ('Fuel Station Updates', 'Updates about fuel stations and services', 'system-admin');

        RAISE NOTICE 'chat_room table created successfully with sample data';
    ELSE
        RAISE NOTICE 'chat_room table already exists';
    END IF;
END
$$;

-- Show the current structure of the chat_room table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_room' 
ORDER BY ordinal_position;

-- Show current chat rooms
SELECT * FROM chat_room ORDER BY created_at DESC;
