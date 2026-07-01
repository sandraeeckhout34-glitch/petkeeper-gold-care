ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_neutered boolean,
  ADD COLUMN IF NOT EXISTS vet_name text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS chronic_conditions text,
  ADD COLUMN IF NOT EXISTS is_insured boolean;