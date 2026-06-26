CREATE TABLE public.personal_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  borrower_name TEXT NOT NULL,
  borrower_contact TEXT,
  principal NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  term_months INTEGER NOT NULL DEFAULT 12,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_loans TO authenticated;
GRANT ALL ON public.personal_loans TO service_role;

ALTER TABLE public.personal_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own loans" ON public.personal_loans
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_personal_loans_updated_at
  BEFORE UPDATE ON public.personal_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();