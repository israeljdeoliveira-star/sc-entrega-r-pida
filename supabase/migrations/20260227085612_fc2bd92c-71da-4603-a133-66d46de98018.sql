
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '5547999999999',
  show_whatsapp_button boolean NOT NULL DEFAULT true,
  gtm_id text DEFAULT '',
  ga4_id text DEFAULT '',
  google_verification text DEFAULT '',
  facebook_pixel_id text DEFAULT '',
  custom_tracking_code text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (whatsapp_number, show_whatsapp_button) VALUES ('5547999999999', true);
