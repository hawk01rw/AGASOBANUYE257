-- Keep signed-in comment identity checks, but evaluate JWT data once per statement.
DROP POLICY IF EXISTS "Signed-in users can comment as themselves" ON public.comments;

CREATE POLICY "Signed-in users can comment as themselves"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND author_name = COALESCE(
    (
      SELECT NULLIF(BTRIM(p.display_name), '')
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
    ),
    NULLIF(SPLIT_PART(((SELECT auth.jwt()) ->> 'email'), '@', 1), ''),
    'Member'
  )
);
