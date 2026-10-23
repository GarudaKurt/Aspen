-- Preserve the non-file identity details entered during provider onboarding.
-- Verification files remain in media_assets/R2 and are not stored in this JSON value.
alter table public.provider_applications
  add column if not exists identity_details jsonb not null default '{}'::jsonb;
