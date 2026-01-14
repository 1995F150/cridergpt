-- =============================================
-- USER NOTIFICATIONS TABLE FOR PUSH NOTIFICATIONS
-- =============================================

-- Create user_notifications table for storing notifications
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System/admin can insert notifications for any user
CREATE POLICY "Authenticated users can receive notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id, read) WHERE read = false;