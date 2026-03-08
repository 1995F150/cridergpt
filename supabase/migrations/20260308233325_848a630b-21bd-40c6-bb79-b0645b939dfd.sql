
CREATE TABLE public.conversation_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'chatgpt',
  filename text,
  message_count integer DEFAULT 0,
  imported_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversation_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage conversation_imports"
  ON public.conversation_imports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.imported_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES public.conversation_imports(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  message_timestamp timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.imported_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage imported_messages"
  ON public.imported_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
