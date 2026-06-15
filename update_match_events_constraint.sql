-- Run this SQL in your Supabase SQL Editor to update the check constraint on match_events table.
-- This allows logging penalty shootout kick events ('penalty_scored' and 'penalty_missed').

ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS match_events_type_check;

ALTER TABLE public.match_events ADD CONSTRAINT match_events_type_check CHECK (
  type = ANY (ARRAY[
    'goal'::text,
    'own_goal'::text,
    'assist'::text,
    'yellow_card'::text,
    'red_card'::text,
    'penalty_scored'::text,
    'penalty_missed'::text
  ])
);
