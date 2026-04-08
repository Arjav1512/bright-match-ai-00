
-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast conversation queries
CREATE INDEX idx_dm_sender ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX idx_dm_receiver ON public.direct_messages (receiver_id, created_at DESC);
CREATE INDEX idx_dm_conversation ON public.direct_messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Students can view messages they sent or received
CREATE POLICY "Users can view own messages"
ON public.direct_messages FOR SELECT
TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = receiver_id)
  AND has_role(auth.uid(), 'student'::app_role)
);

-- Students can send messages
CREATE POLICY "Students can send messages"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND has_role(auth.uid(), 'student'::app_role)
  AND has_role(receiver_id, 'student'::app_role)
);

-- Receiver can mark messages as read
CREATE POLICY "Receiver can mark as read"
ON public.direct_messages FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
