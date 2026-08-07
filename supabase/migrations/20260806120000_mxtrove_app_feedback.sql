-- MxTrove: signed-in app feedback routed into the existing moderation inbox.

alter table public.reports
  add column if not exists subject text,
  add column if not exists page_context text,
  add column if not exists attachment_url text,
  add column if not exists client_context jsonb not null default '{}'::jsonb;

alter table public.reports
  drop constraint if exists reports_target_type_check;

alter table public.reports
  add constraint reports_target_type_check
    check (target_type in ('profile', 'post', 'comment', 'message', 'project_invite', 'share_link', 'app_feedback')),
  add constraint reports_subject_check
    check (subject is null or char_length(btrim(subject)) between 3 and 120),
  add constraint reports_page_context_check
    check (page_context is null or char_length(btrim(page_context)) between 2 and 120),
  add constraint reports_attachment_url_check
    check (attachment_url is null or attachment_url ~* '^https://');

drop policy if exists "reports reporter create" on public.reports;
create policy "reports reporter create"
on public.reports for insert
with check (
  reporter_id = auth.uid()
  and target_type <> 'app_feedback'
);

create or replace function public.submit_app_feedback(
  feedback_kind text,
  feedback_subject text,
  feedback_details text,
  affected_page text default null,
  screenshot_url text default null,
  browser_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_report_id uuid;
  normalized_page text := nullif(btrim(affected_page), '');
  normalized_screenshot text := nullif(btrim(screenshot_url), '');
begin
  if current_user_id is null then
    raise exception 'Please sign in before submitting feedback.';
  end if;
  if feedback_kind not in ('bug', 'feedback', 'feature_request') then
    raise exception 'Choose a valid feedback type.';
  end if;
  if char_length(btrim(feedback_subject)) not between 3 and 120 then
    raise exception 'The subject must contain between 3 and 120 characters.';
  end if;
  if char_length(btrim(feedback_details)) not between 20 and 5000 then
    raise exception 'The description must contain between 20 and 5000 characters.';
  end if;
  if normalized_page is null and normalized_screenshot is null then
    raise exception 'Choose the affected page or attach a screenshot.';
  end if;
  if normalized_screenshot is not null and normalized_screenshot !~* '^https://' then
    raise exception 'The screenshot link must use HTTPS.';
  end if;

  insert into public.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    details,
    subject,
    page_context,
    attachment_url,
    client_context
  ) values (
    current_user_id,
    'app_feedback',
    current_user_id,
    'other',
    btrim(feedback_details),
    btrim(feedback_subject),
    normalized_page,
    normalized_screenshot,
    jsonb_build_object('kind', feedback_kind) || coalesce(browser_context, '{}'::jsonb)
  )
  returning id into new_report_id;

  return new_report_id;
end;
$$;

revoke all on function public.submit_app_feedback(text, text, text, text, text, jsonb) from public;
grant execute on function public.submit_app_feedback(text, text, text, text, text, jsonb) to authenticated;
