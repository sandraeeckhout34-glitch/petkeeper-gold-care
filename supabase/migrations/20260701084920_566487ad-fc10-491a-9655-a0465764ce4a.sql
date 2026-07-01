ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deceased_date date,
  ADD COLUMN IF NOT EXISTS memorial_note text;

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_status_check;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_status_check CHECK (status IN ('active','archived','deceased'));

CREATE INDEX IF NOT EXISTS pets_status_idx ON public.pets(status);