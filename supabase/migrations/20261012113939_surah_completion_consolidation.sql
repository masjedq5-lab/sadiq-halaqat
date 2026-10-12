-- Metadata only: no existing recitation, assignment, or student data is changed.
-- Consolidation sessions use review_* and do not generate new lesson faces.
ALTER TABLE public.recitations
  ADD COLUMN IF NOT EXISTS surah_consolidation_origin_id bigint
    REFERENCES public.recitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS surah_consolidation_surah text,
  ADD COLUMN IF NOT EXISTS surah_consolidation_step smallint,
  ADD COLUMN IF NOT EXISTS surah_consolidation_total smallint;

ALTER TABLE public.recitations
  DROP CONSTRAINT IF EXISTS recitations_surah_consolidation_step_check,
  ADD CONSTRAINT recitations_surah_consolidation_step_check
    CHECK (surah_consolidation_step IS NULL OR surah_consolidation_step IN (1, 2)),
  DROP CONSTRAINT IF EXISTS recitations_surah_consolidation_total_check,
  ADD CONSTRAINT recitations_surah_consolidation_total_check
    CHECK (surah_consolidation_total IS NULL OR surah_consolidation_total IN (1, 2));

CREATE INDEX IF NOT EXISTS recitations_surah_consolidation_progress_idx
  ON public.recitations (surah_consolidation_origin_id, recitation_date, id)
  WHERE surah_consolidation_origin_id IS NOT NULL;

COMMENT ON COLUMN public.recitations.surah_consolidation_origin_id IS
  'Completed surah lesson triggering one or two review days before starting the next surah.';
COMMENT ON COLUMN public.recitations.surah_consolidation_step IS
  'Review day within surah consolidation, 1 or 2; repetition does not advance the day.';
COMMENT ON COLUMN public.recitations.surah_consolidation_total IS
  'Total consolidation days chosen by the teacher: 1 or 2.';
