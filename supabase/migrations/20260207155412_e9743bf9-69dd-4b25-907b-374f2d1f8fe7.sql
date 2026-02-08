
-- Add new columns to shops table for business partner data
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS bp_code TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS dsl_code TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS town TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
