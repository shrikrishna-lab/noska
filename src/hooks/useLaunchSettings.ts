import { useState, useEffect, useCallback } from 'react';
import { supabaseAnon } from '../lib/supabase';
import { getCachedOrFetch, invalidateStaticCache } from '../lib/staticContentCache';
import { EgressMonitor } from '../lib/egressMonitor';

export type LaunchMode = 'waitlist' | 'early_beta' | 'closed_beta' | 'open_beta' | 'public' | 'maintenance';

export interface LaunchSettings {
  id: string;
  launch_mode: LaunchMode;
  login_mode: 'login' | 'launch' | 'waitlist' | 'custom';
  custom_login_url: string | null;
  launch_date: string | null;
  countdown_enabled: boolean;
  auto_switch_mode: LaunchMode | null;
  auto_switch_at: string | null;
  maintenance_title: string;
  maintenance_message: string;
  registration_enabled: boolean;
  show_pricing: boolean;
  show_blog: boolean;
  show_docs: boolean;
  show_changelog: boolean;
  show_login: boolean;
  show_signup: boolean;
  show_waitlist: boolean;
  show_discord: boolean;
  show_community: boolean;
  show_social_links: boolean;
  page_visibility: Record<string, boolean>;
  route_protection: Record<string, unknown>;
  updated_at: string | null;
  published: boolean;
}

export interface CTAButton {
  id: string;
  button_id: string;
  button_text: string;
  destination: string;
  variant: string;
  color: string;
  icon: string | null;
  open_in_new_tab: boolean;
  visible: boolean;
  enabled: boolean;
  animation: string;
  priority: number;
  confirmation_text: string | null;
  requires_auth: boolean;
  launch_mode_override: Record<string, string>;
  ab_variants: Array<{ text: string; destination: string; weight: number }>;
  ab_enabled: boolean;
}

export interface AnnouncementBarData {
  enabled: boolean;
  text: string;
  link_url: string | null;
  link_text: string | null;
  background_color: string;
  text_color: string;
  emoji: string;
  countdown_enabled: boolean;
  countdown_target: string | null;
  dismissible: boolean;
  sticky: boolean;
  animation: string;
  position: string;
  bg_style: string;
  gradient_start: string | null;
  gradient_end: string | null;
  font_size: string;
  border_style: string;
  page_target: string;
  auto_dismiss_seconds: number | null;
  start_at: string | null;
  end_at: string | null;
  secondary_link_url: string | null;
  secondary_link_text: string | null;
  show_close_button: boolean;
}

export interface LandingContent {
  section: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  secondary_cta_text: string | null;
  secondary_cta_link: string | null;
  image_url: string | null;
  badge: string | null;
  active: boolean;
}

const DEFAULT_SETTINGS: LaunchSettings = {
  id: '',
  launch_mode: 'waitlist',
  login_mode: 'login',
  custom_login_url: null,
  launch_date: null,
  countdown_enabled: false,
  auto_switch_mode: null,
  auto_switch_at: null,
  maintenance_title: 'Scheduled Maintenance',
  maintenance_message: 'We are performing scheduled maintenance. We will be back shortly.',
  registration_enabled: true,
  show_pricing: true,
  show_blog: true,
  show_docs: true,
  show_changelog: true,
  show_login: true,
  show_signup: true,
  show_waitlist: true,
  show_discord: true,
  show_community: true,
  show_social_links: true,
  page_visibility: { blog: true, pricing: true, templates: true, roadmap: true, careers: true, community: true },
  route_protection: {},
  updated_at: null,
  published: true,
};

function useSupabaseQuery(table: string) {
  return supabaseAnon?.from(table as never);
}

export function invalidateLaunchCache(prefix?: string) {
  invalidateStaticCache(prefix ? `launch_${prefix}` : 'launch_');
}

export function useLaunchSettings(): { settings: LaunchSettings; loading: boolean } {
  const [settings, setSettings] = useState<LaunchSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<LaunchSettings>(
      'launch_settings',
      async () => {
        EgressMonitor.logEvent('query', 'launch_settings');
        const { data } = (await useSupabaseQuery('launch_settings')?.select('*').limit(1).single()) ?? {};
        return data ? { ...DEFAULT_SETTINGS, ...(data as unknown as LaunchSettings) } : DEFAULT_SETTINGS;
      },
      5 * 60 * 1000
    )
      .then((data) => {
        if (isMounted) {
          setSettings(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useLaunchSettings load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading };
}

const DEFAULT_CTAS: Record<string, CTAButton> = {};

function makeDefaultCTA(id: string, text: string, dest: string, variant = 'primary', priority = 0): CTAButton {
  return {
    id: '',
    button_id: id,
    button_text: text,
    destination: dest,
    variant,
    color: 'default',
    icon: null,
    open_in_new_tab: false,
    visible: true,
    enabled: true,
    animation: 'none',
    priority,
    confirmation_text: null,
    requires_auth: false,
    launch_mode_override: {},
    ab_variants: [],
    ab_enabled: false,
  };
}

[
  'navbar_login',
  'navbar_cta',
  'navbar_demo',
  'hero_primary',
  'hero_secondary',
  'footer_cta',
  'pricing_cta',
  'final_cta_primary',
  'final_cta_secondary',
  'mobile_login',
  'mobile_cta',
  'launch_hero_primary',
  'launch_hero_secondary',
  'launch_navbar_login',
  'launch_navbar_cta',
].forEach((id) => {
  DEFAULT_CTAS[id] = makeDefaultCTA(id, id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()), '/');
});

DEFAULT_CTAS.navbar_login = makeDefaultCTA('navbar_login', 'Log in', '/login', 'ghost', 10);
DEFAULT_CTAS.navbar_cta = makeDefaultCTA('navbar_cta', 'Get Noska free', '/login', 'primary', 11);
DEFAULT_CTAS.navbar_demo = makeDefaultCTA('navbar_demo', 'Request a demo', '/enterprise', 'ghost', 9);
DEFAULT_CTAS.hero_primary = makeDefaultCTA('hero_primary', 'Get started free', '/login', 'primary', 20);
DEFAULT_CTAS.hero_secondary = makeDefaultCTA('hero_secondary', "See what's inside", '/product', 'secondary', 19);
DEFAULT_CTAS.footer_cta = makeDefaultCTA('footer_cta', 'Get Noska free', '/login', 'primary', 30);
DEFAULT_CTAS.pricing_cta = makeDefaultCTA('pricing_cta', 'View all plans', '/pricing', 'primary', 40);
DEFAULT_CTAS.final_cta_primary = makeDefaultCTA('final_cta_primary', 'Get Noska free', '/login', 'primary', 60);
DEFAULT_CTAS.final_cta_secondary = makeDefaultCTA('final_cta_secondary', 'View all plans', '/pricing', 'secondary', 59);
DEFAULT_CTAS.mobile_login = makeDefaultCTA('mobile_login', 'Log in', '/login', 'ghost', 50);
DEFAULT_CTAS.mobile_cta = makeDefaultCTA('mobile_cta', 'Get Noska free', '/login', 'primary', 51);
DEFAULT_CTAS.launch_navbar_login = makeDefaultCTA('launch_navbar_login', 'Log in', '/login', 'ghost', 80);
DEFAULT_CTAS.launch_navbar_cta = makeDefaultCTA('launch_navbar_cta', 'Join Waitlist', '/launch', 'primary', 81);
DEFAULT_CTAS.launch_hero_primary = makeDefaultCTA('launch_hero_primary', 'Join Waitlist', '/launch', 'primary', 70);
DEFAULT_CTAS.launch_hero_secondary = makeDefaultCTA('launch_hero_secondary', 'Watch Demo', '#demo', 'secondary', 69);

export function useCTAButtons(): {
  buttons: Record<string, CTAButton>;
  getButton: (buttonId: string) => CTAButton;
  getDestination: (buttonId: string) => string;
  getButtonText: (buttonId: string) => string;
  loading: boolean;
} {
  const [ctaMap, setCtaMap] = useState<Record<string, CTAButton>>(DEFAULT_CTAS);
  const [loading, setLoading] = useState(true);
  const { settings } = useLaunchSettings();

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<Record<string, CTAButton>>(
      'launch_cta_buttons',
      async () => {
        EgressMonitor.logEvent('query', 'cta_buttons');
        const { data } = (await useSupabaseQuery('cta_buttons')?.select('*').order('priority')) ?? {};
        const map: Record<string, CTAButton> = {};
        if (data) {
          for (const btn of data as unknown as CTAButton[]) {
            map[btn.button_id] = btn;
          }
        }
        return map;
      },
      5 * 60 * 1000
    )
      .then((map) => {
        if (isMounted) {
          setCtaMap((prev) => ({ ...prev, ...map }));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useCTAButtons load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getButton = useCallback(
    (buttonId: string): CTAButton => {
      const btn = ctaMap[buttonId];
      if (!btn) return DEFAULT_CTAS[buttonId] ?? makeDefaultCTA(buttonId, buttonId, '/', 'primary', 0);

      const override = (btn.launch_mode_override ?? {})[settings.launch_mode];
      if (override) return { ...btn, destination: override };

      if (btn.destination === '/login' || btn.button_id.includes('login')) {
        if (settings.login_mode === 'launch') return { ...btn, destination: '/launch' };
        if (settings.login_mode === 'waitlist') return { ...btn, destination: '/waitlist' };
        if (settings.login_mode === 'custom' && settings.custom_login_url) return { ...btn, destination: settings.custom_login_url };
      }

      return btn;
    },
    [ctaMap, settings]
  );

  const getDestination = useCallback((buttonId: string): string => getButton(buttonId).destination, [getButton]);
  const getButtonText = useCallback((buttonId: string): string => getButton(buttonId).button_text, [getButton]);

  return { buttons: ctaMap, getButton, getDestination, getButtonText, loading };
}

export function useAnnouncementBar(): { bar: AnnouncementBarData | null; loading: boolean } {
  const [bar, setBar] = useState<AnnouncementBarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<AnnouncementBarData | null>(
      'launch_announcement_bar',
      async () => {
        EgressMonitor.logEvent('query', 'announcement_bar');
        const { data } = (await useSupabaseQuery('announcement_bar')?.select('*').limit(1).single()) ?? {};
        return (data as unknown as AnnouncementBarData) || null;
      },
      5 * 60 * 1000
    )
      .then((data) => {
        if (isMounted) {
          setBar(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useAnnouncementBar load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { bar, loading };
}

export function useLandingContent(): {
  content: LandingContent[];
  getSection: (section: string) => LandingContent | undefined;
  loading: boolean;
} {
  const [content, setContent] = useState<LandingContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<LandingContent[]>(
      'launch_landing_content',
      async () => {
        EgressMonitor.logEvent('query', 'landing_content');
        const { data } = (await useSupabaseQuery('landing_content')?.select('*').order('sort_order')) ?? {};
        return (data as unknown as LandingContent[]) || [];
      },
      5 * 60 * 1000
    )
      .then((data) => {
        if (isMounted) {
          setContent(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useLandingContent load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getSection = useCallback(
    (section: string): LandingContent | undefined => content.find((c) => c.section === section && c.active),
    [content]
  );
  return { content, getSection, loading };
}

export function useSubmitWaitlist(): {
  submit: (data: {
    email: string;
    name?: string;
    company?: string;
    role?: string;
    country?: string;
    referral_code?: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  submitting: boolean;
} {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (data: {
      email: string;
      name?: string;
      company?: string;
      role?: string;
      country?: string;
      referral_code?: string;
      phone?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      setSubmitting(true);
      try {
        const BASE = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseAnon || !BASE) {
          const res = await fetch(`${BASE}/functions/v1/waitlist-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) return { success: false, error: result.error ?? 'Failed to join' };
          return { success: true };
        }

        const { data: existing } =
          (await useSupabaseQuery('waitlist_entries')?.select('id').eq('email' as never, data.email).maybeSingle()) ??
          {};
        if (existing) return { success: false, error: 'This email is already on the waitlist.' };

        const { error } =
          (await useSupabaseQuery('waitlist_entries')?.insert({
            email: data.email,
            name: data.name ?? null,
            provider: 'direct',
            status: 'waiting',
            country: data.country ?? null,
            joined_at: new Date().toISOString(),
            referral_count: 0,
          } as never)) ?? {};
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to join waitlist' };
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submit, submitting };
}

export interface WaitlistSettingsData {
  enabled: boolean;
  collect_name: boolean;
  collect_company: boolean;
  collect_role: boolean;
  collect_country: boolean;
  collect_referral_code: boolean;
  collect_phone: boolean;
  email_verification: boolean;
  double_opt_in: boolean;
  auto_approve: boolean;
  confirmation_title: string;
  confirmation_message: string;
}

export interface SEOSettingsData {
  page_path: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_card: string | null;
  twitter_site: string | null;
  keywords: string | null;
  robots: string | null;
  canonical_url: string | null;
}

export function useSEOSettings(pagePath: string): { seo: SEOSettingsData | null; loading: boolean } {
  const [data, setData] = useState<SEOSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<SEOSettingsData | null>(
      `launch_seo_${pagePath}`,
      async () => {
        EgressMonitor.logEvent('query', 'seo_settings', { pagePath });
        const { data: result } =
          (await useSupabaseQuery('seo_settings')
            ?.select('page_path, title, description, og_image, og_title, og_description, twitter_card, twitter_site, keywords, robots, canonical_url')
            .eq('page_path' as never, pagePath)
            .maybeSingle()) ?? {};
        return (result as unknown as SEOSettingsData) || null;
      },
      10 * 60 * 1000
    )
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useSEOSettings load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pagePath]);

  return { seo: data, loading };
}

export function useWaitlistSettingsData(): { waitlistSettings: WaitlistSettingsData | null; loading: boolean } {
  const [data, setData] = useState<WaitlistSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<WaitlistSettingsData | null>(
      'launch_waitlist_settings',
      async () => {
        EgressMonitor.logEvent('query', 'waitlist_settings');
        const { data: result } = (await useSupabaseQuery('waitlist_settings')?.select('*').limit(1).single()) ?? {};
        return (result as unknown as WaitlistSettingsData) || null;
      },
      5 * 60 * 1000
    )
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useWaitlistSettingsData load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { waitlistSettings: data, loading };
}

export function useSocialLinks(): {
  links: Array<{ platform: string; url: string; label: string | null; active: boolean }>;
  loading: boolean;
} {
  const [links, setLinks] = useState<Array<{ platform: string; url: string; label: string | null; active: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedOrFetch<Array<{ platform: string; url: string; label: string | null; active: boolean }>>(
      'launch_social_links',
      async () => {
        EgressMonitor.logEvent('query', 'social_links');
        const { data } =
          (await useSupabaseQuery('social_links')?.select('platform, url, label, active').order('sort_order')) ?? {};
        return (data as unknown as Array<{ platform: string; url: string; label: string | null; active: boolean }>) || [];
      },
      10 * 60 * 1000
    )
      .then((data) => {
        if (isMounted) {
          setLinks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('useSocialLinks load error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { links, loading };
}
