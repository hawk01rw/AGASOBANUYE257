-- Remove exact duplicate non-unique indexes already covered by unique indexes.
DROP INDEX IF EXISTS public.episodes_season_idx;
DROP INDEX IF EXISTS public.seasons_series_idx;
