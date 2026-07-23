begin;

alter table public.media_processing_jobs
  add column if not exists target_post_id uuid references public.posts (id) on delete set null;

create index if not exists media_processing_jobs_target_post_idx
  on public.media_processing_jobs (target_post_id, created_at desc)
  where target_post_id is not null;

commit;
