-- Fix foreign key constraint issues in chat_message table
-- This script removes problematic foreign key constraints and ensures the table works properly

-- First, let's check if there are any foreign key constraints on chat_room_id
-- and remove them if they exist

-- Drop the foreign key constraint if it exists
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

-- Ensure chat_room_id is nullable and of correct type
ALTER TABLE chat_message 
ALTER COLUMN chat_room_id DROP NOT NULL,
ALTER COLUMN chat_room_id TYPE BIGINT;

-- Add an index for better performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_chat_message_chat_room_id ON chat_message(chat_room_id);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_message' 
ORDER BY ordinal_position;

-- Show any remaining constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'chat_message';

-- Insert a test message to verify everything works
INSERT INTO chat_message (
    chat_message_receiver, 
    message, 
    created_by, 
    chat_room_id
) VALUES (
    'test-receiver-uuid',
    'Test message after constraint fix',
    'test-sender-uuid',
    123456789
) ON CONFLICT DO NOTHING;

-- Clean up the test message
DELETE FROM chat_message 
WHERE message = 'Test message after constraint fix' 
AND created_by = 'test-sender-uuid';

SELECT 'Foreign key constraint fixed successfully!' as status;
