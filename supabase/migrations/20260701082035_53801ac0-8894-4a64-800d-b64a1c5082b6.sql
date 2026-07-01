
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS invoice_path text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description text;
