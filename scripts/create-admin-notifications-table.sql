-- Create admin_notifications table for push notification system
CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_id INTEGER REFERENCES chat_message(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) DEFAULT 'new_message',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_sender_id ON admin_notifications(sender_id);

-- Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view their own notifications" ON admin_notifications
  FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "System can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update their own notifications" ON admin_notifications
  FOR UPDATE USING (admin_id = auth.uid());

-- Create function to automatically create notifications when messages are sent to admins
CREATE OR REPLACE FUNCTION create_admin_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the receiver is an admin (you can customize this logic)
  -- For now, we'll create notifications for all messages
  INSERT INTO admin_notifications (
    admin_id,
    sender_id,
    message_id,
    notification_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    NEW.chat_message_receiver,
    NEW.created_by,
    NEW.id,
    'new_message',
    'New Message Received',
    CASE 
      WHEN LENGTH(NEW.message) > 100 THEN LEFT(NEW.message, 100) || '...'
      ELSE NEW.message
    END,
    'normal',
    jsonb_build_object(
      'chat_room_id', NEW.chat_room_id,
      'message_preview', LEFT(NEW.message, 50)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notifications
DROP TRIGGER IF EXISTS trigger_create_admin_notification ON chat_message;
CREATE TRIGGER trigger_create_admin_notification
  AFTER INSERT ON chat_message
  FOR EACH ROW
  WHEN (NEW.chat_message_receiver IS NOT NULL)
  EXECUTE FUNCTION create_admin_notification();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON admin_notifications TO authenticated;
GRANT USAGE ON SEQUENCE admin_notifications_id_seq TO authenticated;

-- Add some sample data (optional)
-- INSERT INTO admin_notifications (admin_id, sender_id, title, message, priority) 
-- VALUES 
--   ('admin-uuid-here', 'user-uuid-here', 'Welcome', 'Welcome to the notification system!', 'low'),
--   ('admin-uuid-here', 'user-uuid-here', 'System Alert', 'High priority system notification', 'high');

COMMENT ON TABLE admin_notifications IS 'Stores push notifications for admin users';
COMMENT ON COLUMN admin_notifications.priority IS 'Notification priority: low, normal, high, urgent';
COMMENT ON COLUMN admin_notifications.metadata IS 'Additional notification data in JSON format';
