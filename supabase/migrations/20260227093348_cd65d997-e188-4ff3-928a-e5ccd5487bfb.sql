
-- Create service_photos table
CREATE TABLE public.service_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service photos"
  ON public.service_photos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage service photos"
  ON public.service_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true);

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view service photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-photos');

-- Admins can upload
CREATE POLICY "Admins can upload service photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'service-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete service photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'service-photos' AND has_role(auth.uid(), 'admin'::app_role));
