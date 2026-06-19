
CREATE TABLE public.money_split_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  envelopes JSONB NOT NULL DEFAULT '{}'::jsonb,
  pct JSONB NOT NULL DEFAULT '{}'::jsonb,
  cash_bills JSONB NOT NULL DEFAULT '{}'::jsonb,
  round_mode TEXT NOT NULL DEFAULT 'off',
  income NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'weekly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_split_state TO authenticated;
GRANT ALL ON public.money_split_state TO service_role;
ALTER TABLE public.money_split_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own split state" ON public.money_split_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER money_split_state_updated_at BEFORE UPDATE ON public.money_split_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.money_split_txns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  bucket TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX money_split_txns_user_ts ON public.money_split_txns(user_id, ts DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_split_txns TO authenticated;
GRANT ALL ON public.money_split_txns TO service_role;
ALTER TABLE public.money_split_txns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own split txns" ON public.money_split_txns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.money_split_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  income NUMERIC NOT NULL,
  period TEXT NOT NULL,
  pct JSONB NOT NULL,
  cash_bills JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX money_split_history_user_ts ON public.money_split_history(user_id, ts DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_split_history TO authenticated;
GRANT ALL ON public.money_split_history TO service_role;
ALTER TABLE public.money_split_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own split history" ON public.money_split_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.money_split_meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  budget NUMERIC NOT NULL,
  household_size INT NOT NULL DEFAULT 1,
  notes TEXT,
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX money_split_meal_plans_user_week ON public.money_split_meal_plans(user_id, week_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_split_meal_plans TO authenticated;
GRANT ALL ON public.money_split_meal_plans TO service_role;
ALTER TABLE public.money_split_meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meal plans" ON public.money_split_meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER money_split_meal_plans_updated_at BEFORE UPDATE ON public.money_split_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
