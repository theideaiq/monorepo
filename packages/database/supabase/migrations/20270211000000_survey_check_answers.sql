-- Surveys: respondents can't read the expected answers of check questions.
--
-- Anyone who can see a survey reads its questions (RLS), so the expected
-- answer of a check question (`attention_answer`) was readable before
-- answering. The apps now read `is_attention` instead, and the creator and
-- support read the answers with `survey_attention_answers()`; here the
-- column itself is closed to anon and authenticated. A column added to
-- survey_questions later needs its own grant.

revoke select on public.survey_questions from anon, authenticated;
grant select (id, survey_id, position, kind, prompt, options, required, is_attention)
  on public.survey_questions to anon, authenticated;
