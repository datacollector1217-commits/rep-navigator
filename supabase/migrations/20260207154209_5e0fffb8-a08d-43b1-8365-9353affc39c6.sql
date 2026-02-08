
-- Create fuel_logs table for tracking fuel fill-ups
CREATE TABLE public.fuel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meter_reading NUMERIC NOT NULL,
  liters NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can do everything with fuel_logs"
  ON public.fuel_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Reps can create own fuel_logs"
  ON public.fuel_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reps can view own fuel_logs"
  ON public.fuel_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Reps can update own fuel_logs"
  ON public.fuel_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reps can delete own fuel_logs"
  ON public.fuel_logs FOR DELETE
  USING (auth.uid() = user_id);
