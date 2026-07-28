alter table public.collaboration_activity
  drop constraint if exists collaboration_activity_type_check;

alter table public.collaboration_activity
  add constraint collaboration_activity_type_check
  check (
    activity_type in (
      'project_created',
      'member_invited',
      'member_joined',
      'member_removed',
      'member_left',
      'role_changed',
      'ownership_transferred',
      'track_added',
      'track_removed',
      'track_reordered',
      'version_uploaded',
      'version_selected',
      'version_review_status_changed',
      'feedback_added',
      'feedback_resolved',
      'feedback_status_changed',
      'status_changed',
      'project_published',
      'project_archived'
    )
  );
