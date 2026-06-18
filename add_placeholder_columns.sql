-- Run this SQL in your Supabase SQL Editor to add placeholder columns to the matches table.
-- After running, if you still get schema cache errors, run: NOTIFY pgrst, 'reload schema';

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS placeholder_home text null,
ADD COLUMN IF NOT EXISTS placeholder_away text null;
