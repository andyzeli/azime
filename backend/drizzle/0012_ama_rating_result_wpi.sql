-- Only whole-person percentages can be represented by the new wpi field.
-- Refuse unsupported legacy units instead of silently relabeling their values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ama_rating_tables", jsonb_array_elements("results") AS entries(result)
    WHERE result ? 'impairment'
      AND (
        result ? 'wpi'
        OR jsonb_typeof(result -> 'impairment') IS DISTINCT FROM 'object'
        OR result -> 'impairment' ->> 'unit' IS DISTINCT FROM 'WPI'
        OR jsonb_typeof(result -> 'impairment' -> 'value') IS DISTINCT FROM 'number'
        OR CASE WHEN jsonb_typeof(result -> 'impairment' -> 'value') = 'number'
          THEN (result -> 'impairment' ->> 'value')::numeric NOT BETWEEN 0 AND 100
          ELSE false END
      )
  ) THEN
    RAISE EXCEPTION 'AMA rating results contain unsupported or invalid legacy impairment; review units and values before migrating to WPI';
  END IF;

  UPDATE "ama_rating_tables"
  SET "results" = (
    SELECT jsonb_agg(
      CASE WHEN result ? 'impairment' THEN
        (result - 'impairment') || jsonb_build_object('wpi', result -> 'impairment' -> 'value')
      ELSE result END
      ORDER BY position
    )
    FROM jsonb_array_elements("results") WITH ORDINALITY AS entries(result, position)
  )
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements("results") AS entries(result)
    WHERE result ? 'impairment'
  );
END $$;
