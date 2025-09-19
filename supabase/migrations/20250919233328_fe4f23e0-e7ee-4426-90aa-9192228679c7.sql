-- Add trigger for friend request updates
CREATE TRIGGER friend_request_status_trigger
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_friend_request_update();

-- Add updated_at trigger for friend_requests  
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for direct_messages
CREATE TRIGGER update_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_conversations_participants ON public.direct_conversations(participant1_id, participant2_id);