-- Create a table to track feature unlock notifications
CREATE TABLE public.feature_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'subscription_updated', 'features_unlocked', etc.
  data JSONB, -- Additional data about the notification
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feature_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.feature_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for service role to insert notifications
CREATE POLICY "Service role can insert notifications" 
ON public.feature_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create policy for users to update their own notifications
CREATE POLICY "Users can update their own notifications" 
ON public.feature_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER TABLE public.feature_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_notifications;