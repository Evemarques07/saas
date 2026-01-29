-- Enable Realtime for subscriptions table
-- This allows the frontend to receive instant updates when subscription status changes

-- Add subscriptions table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- Comment for documentation
COMMENT ON TABLE subscriptions IS 'Subscription records with Realtime enabled for instant payment status updates';
