-- Non-destructive: existing position-based recitations keep their current behavior.
ALTER TABLE public.recitations
  ADD COLUMN IF NOT EXISTS recording_mode text NOT NULL DEFAULT 'positions',
  ADD COLUMN IF NOT EXISTS review_amount_value numeric,
  ADD COLUMN IF NOT EXISTS review_amount_unit text;

ALTER TABLE public.recitations
  ADD CONSTRAINT recitations_recording_mode_check
    CHECK (recording_mode IN ('positions', 'amount')),
  ADD CONSTRAINT recitations_review_amount_unit_check
    CHECK (review_amount_unit IS NULL OR review_amount_unit IN ('lines', 'faces')),
  ADD CONSTRAINT recitations_review_amount_nonnegative_check
    CHECK (review_amount_value IS NULL OR review_amount_value >= 0);

COMMENT ON COLUMN public.recitations.recording_mode IS
  'positions = surah/ayah cursor based; amount = quantity only, never advances the automatic surah/ayah cursor.';
COMMENT ON COLUMN public.recitations.review_amount_value IS
  'Original manually measured revision quantity when recording_mode=amount; review_faces remains normalized faces.';
COMMENT ON COLUMN public.recitations.review_amount_unit IS
  'lines or faces, using 15 Quran lines per face for numeric-only recitation.';
