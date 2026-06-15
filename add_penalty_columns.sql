-- Run this SQL in your Supabase SQL Editor to add penalty score columns to the matches table.
-- After running, if you still get schema cache errors, run: NOTIFY pgrst, 'reload schema';

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS home_penalty_score integer null,
ADD COLUMN IF NOT EXISTS away_penalty_score integer null;
