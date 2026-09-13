-- Gamified widget pack: streak tracker (Duolingo-style), focus timer,
-- animated activity graph and progress rings. Registered client-side in the
-- widget registry; catalog rows control availability/rollout.

insert into public.widget_catalog
  (id, name, description, category, status, rollout_percent, default_enabled, default_size, allowed_sizes, platforms, version)
values
  ('streak-tracker', 'Streak Tracker',
   'Duolingo-style daily streak with an animated flame and weekly check-ins.',
   'gamified', 'beta', 100, true, 'small',
   array['small','medium'],
   array['web','macos','windows','linux','mobile'], '1.0.0'),
  ('focus-timer', 'Focus Timer',
   'Animated 25-minute focus ring — start, pause and finish deep-work sessions.',
   'gamified', 'beta', 100, false, 'small',
   array['small','medium'],
   array['web','macos','windows','linux'], '1.0.0'),
  ('activity-graph', 'Activity Graph',
   'Animated bar graph of your pages and tasks touched each day this week.',
   'gamified', 'beta', 100, true, 'small',
   array['small','medium'],
   array['web','macos','windows','linux','mobile'], '1.0.0'),
  ('progress-rings', 'Progress Rings',
   'Animated goal rings for pages, tasks and focus — your day at a glance.',
   'gamified', 'beta', 100, false, 'medium',
   array['small','medium'],
   array['web','macos','windows','linux'], '1.0.0')
on conflict (id) do nothing;
