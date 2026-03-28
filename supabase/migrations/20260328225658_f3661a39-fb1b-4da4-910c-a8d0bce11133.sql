
-- Part 1: Add NFC tracking columns to livestock_tag_pool
ALTER TABLE public.livestock_tag_pool 
  ADD COLUMN IF NOT EXISTS nfc_written_at timestamptz,
  ADD COLUMN IF NOT EXISTS nfc_written_by uuid,
  ADD COLUMN IF NOT EXISTS nfc_locked boolean DEFAULT false;

-- Part 2: Create livestock_devices table
CREATE TABLE public.livestock_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  device_name text NOT NULL,
  device_token text NOT NULL UNIQUE,
  device_type text DEFAULT 'raspberry_pi',
  last_heartbeat timestamptz,
  status text DEFAULT 'offline',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.livestock_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their own devices"
  ON public.livestock_devices
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Part 3: Create livestock_device_logs table
CREATE TABLE public.livestock_device_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.livestock_devices(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.livestock_device_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Device owners can read their device logs"
  ON public.livestock_device_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.livestock_devices d
      WHERE d.id = livestock_device_logs.device_id
      AND d.owner_id = auth.uid()
    )
  );
