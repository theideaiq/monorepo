-- PR 7, A22: survey results pages. Respondents already see a summary on the
-- survey's page once it closes (`survey_summary`, no count under 5, academic
-- surveys may turn it off). Now they also hear when it is ready: when a
-- survey closes with its summary on and at least 5 counted responses (fewer
-- shows nothing), everyone who submitted answers and didn't withdraw them
-- gets one `survey_results` notification linking to the survey's page.

create function private.notify_survey_results()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' and new.share_summary
    and (
      select count(*) from public.survey_responses r
      where r.survey_id = new.id and r.counted and r.withdrawn_at is null
    ) >= 5
  then
    perform private.notify(
      r.user_id, 'order', 'survey_results',
      jsonb_build_object('survey_id', new.id, 'title', new.title),
      '/club/surveys/' || new.id
    )
    from public.survey_responses r
    where r.survey_id = new.id and r.submitted_at is not null and r.withdrawn_at is null;
  end if;
  return null;
end;
$$;

revoke all on function private.notify_survey_results() from public, anon, authenticated;

create trigger notify_survey_results after update of status on public.surveys
  for each row execute function private.notify_survey_results();
