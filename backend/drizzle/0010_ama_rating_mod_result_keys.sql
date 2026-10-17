-- Column renames do not rename keys inside the stored result array.
UPDATE "ama_rating_tables"
SET "results" = (
  SELECT jsonb_agg(
    CASE WHEN result ? 'second_option_id' THEN
      (result - 'second_option_id') || jsonb_build_object(
        'mod_option_id', COALESCE(result -> 'mod_option_id', result -> 'second_option_id')
      )
    ELSE result END
    ORDER BY position
  )
  FROM jsonb_array_elements("results") WITH ORDINALITY AS entries(result, position)
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements("results") AS entries(result)
  WHERE result ? 'second_option_id'
);
