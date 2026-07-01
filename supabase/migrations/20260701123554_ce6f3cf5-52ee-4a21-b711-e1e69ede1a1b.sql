ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.pets
DROP CONSTRAINT IF EXISTS pets_status_check;

ALTER TABLE public.pets
ADD CONSTRAINT pets_status_check
CHECK (status = ANY (ARRAY['active'::text, 'archived'::text, 'deceased'::text, 'deleted'::text]));