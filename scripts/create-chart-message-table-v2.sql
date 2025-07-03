-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS chart_message CASCADE;

-- Create chart_message table
CREATE TABLE chart_message (
  id BIGSERIAL PRIMARY KEY,
  chart_message_sender TEXT NOT NULL,
  chart_message_receiver TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chart_message_receiver ON chart_message(chart_message_receiver);
CREATE INDEX idx_chart_message_sender ON chart_message(chart_message_sender);
CREATE INDEX idx_chart_message_created_at ON chart_message(created_at DESC);
CREATE INDEX idx_chart_message_conversation ON chart_message(chart_message_sender, chart_message_receiver);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chart_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_chart_message_updated_at
  BEFORE UPDATE ON chart_message
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_message_updated_at();

-- Insert sample data for testing
INSERT INTO chart_message (chart_message_sender, chart_message_receiver, message, message_type) VALUES
('admin@feasy.com', 'user1@example.com', 'Hello! Welcome to Feasy. How can I help you today?', 'text'),
('user1@example.com', 'admin@feasy.com', 'Hi! I''m having trouble with the fuel pump at Station #3. It''s not dispensing properly.', 'text'),
('admin@feasy.com', 'user1@example.com', 'I''m sorry to hear about that issue. Let me check the status of that pump for you right away.', 'text'),
('admin@feasy.com', 'user1@example.com', 'I can see that pump #2 at Station #3 is currently under maintenance. Please use pump #1 or #3 instead.', 'text'),
('user1@example.com', 'admin@feasy.com', 'Thank you! Pump #1 is working fine. When will pump #2 be fixed?', 'text'),
('admin@feasy.com', 'user1@example.com', 'Our technician is scheduled to fix it by 2 PM today. You''ll receive a notification once it''s operational again.', 'text'),
('user2@example.com', 'admin@feasy.com', 'Good morning! Our fuel delivery arrived early today at Station #5.', 'text'),
('admin@feasy.com', 'user2@example.com', 'That''s great news! Any issues with the quality check?', 'text'),
('user2@example.com', 'admin@feasy.com', 'Everything looks good. Quality passed all tests.', 'text'),
('user3@example.com', 'admin@feasy.com', 'Thank you for the excellent service yesterday! The team was very professional.', 'text'),
('admin@feasy.com', 'user3@example.com', 'Thank you for the kind words! We''re always here to help.', 'text');

-- Verify table creation
SELECT 'Table created successfully' as status;
SELECT COUNT(*) as sample_messages FROM chart_message;
