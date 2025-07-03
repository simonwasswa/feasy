-- Fix chat_message table to work without chat_rooms table dependency
-- This approach uses a simple integer for chat_room_id without foreign key constraints

-- First, drop the foreign key constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_message_chat_room_id_fkey' 
        AND table_name = 'chat_message'
    ) THEN
        ALTER TABLE chat_message DROP CONSTRAINT chat_message_chat_room_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint chat_message_chat_room_id_fkey';
    END IF;
END $$;

-- Make sure chat_room_id column allows NULL values
ALTER TABLE chat_message ALTER COLUMN chat_room_id DROP NOT NULL;

-- Update any NULL chat_room_id values to a simple numeric ID
UPDATE chat_message 
SET chat_room_id = 1
WHERE chat_room_id IS NULL;

-- Create a simple function to generate chat room IDs based on user pairs
CREATE OR REPLACE FUNCTION generate_simple_chat_room_id(user1 TEXT, user2 TEXT)
RETURNS INTEGER AS $$
DECLARE
    room_id INTEGER;
    hash_input TEXT;
BEGIN
    -- Create consistent hash input by sorting users
    IF user1 < user2 THEN
        hash_input := user1 || '_' || user2;
    ELSE
        hash_input := user2 || '_' || user1;
    END IF;
    
    -- Generate a simple hash-based room ID
    room_id := (hashtext(hash_input) % 1000000)::INTEGER;
    
    -- Ensure positive number
    IF room_id < 0 THEN
        room_id := room_id * -1;
    END IF;
    
    -- Ensure it's not zero
    IF room_id = 0 THEN
        room_id := 1;
    END IF;
    
    RETURN room_id;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT generate_simple_chat_room_id('user1', 'user2') as test_room_id;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_message' 
ORDER BY ordinal_position;

SELECT 'Chat message table updated successfully - no foreign key constraints!' as status;
