-- Update the chat_message table to handle the chat_room_id field properly
-- This script will help ensure your table structure is compatible

-- First, let's see the current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chat_message' 
ORDER BY ordinal_position;

-- If chat_room_id doesn't exist, create it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_message' AND column_name = 'chat_room_id'
    ) THEN
        ALTER TABLE chat_message ADD COLUMN chat_room_id TEXT;
    END IF;
END $$;

-- Update existing records to have chat_room_ids
-- This creates room IDs based on sender and receiver pairs
UPDATE chat_message 
SET chat_room_id = 'room_' || 
    CASE 
        WHEN created_by < chat_message_receiver 
        THEN created_by || '_' || chat_message_receiver
        ELSE chat_message_receiver || '_' || created_by
    END
WHERE chat_room_id IS NULL;

-- Make chat_room_id NOT NULL after updating existing records
ALTER TABLE chat_message ALTER COLUMN chat_room_id SET NOT NULL;

-- Create an index on chat_room_id for better performance
CREATE INDEX IF NOT EXISTS idx_chat_message_room_id ON chat_message(chat_room_id);

-- Create an index on the combination for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_message_room_created ON chat_message(chat_room_id, created_at);

-- Show the updated structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chat_message' 
ORDER BY ordinal_position;

-- Show sample data with the new chat_room_id
SELECT id, chat_room_id, created_by, chat_message_receiver, message, created_at
FROM chat_message 
ORDER BY created_at DESC 
LIMIT 5;
