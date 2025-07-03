-- Create chart_message table
CREATE TABLE IF NOT EXISTS chart_message (
  id SERIAL PRIMARY KEY,
  chart_message_sender VARCHAR(255) NOT NULL,
  chart_message_receiver VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_message_receiver ON chart_message(chart_message_receiver);
CREATE INDEX IF NOT EXISTS idx_chart_message_sender ON chart_message(chart_message_sender);
CREATE INDEX IF NOT EXISTS idx_chart_message_created_at ON chart_message(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chart_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chart_message_updated_at
  BEFORE UPDATE ON chart_message
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_message_updated_at();

-- Insert some sample data
INSERT INTO chart_message (chart_message_sender, chart_message_receiver, message, message_type) VALUES
('admin@feasy.com', 'user1@example.com', 'Hello! How can I help you today?', 'text'),
('user1@example.com', 'admin@feasy.com', 'Hi, I''m having trouble with the fuel pump at Station #3.', 'text'),
('admin@feasy.com', 'user1@example.com', 'I''ll check the status of that pump for you right away.', 'text'),
('user2@example.com', 'admin@feasy.com', 'Good morning! Our fuel delivery arrived early today.', 'text'),
('admin@feasy.com', 'user2@example.com', 'That''s great news! Any issues with the quality check?', 'text'),
('user3@example.com', 'admin@feasy.com', 'Thank you for the excellent service yesterday!', 'text');
