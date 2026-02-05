-- Create storage bucket for shop preview images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-previews', 'shop-previews', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view shop previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-previews');

-- Allow admin uploads (via service role in edge function)
CREATE POLICY "Service role can upload shop previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-previews');

-- Allow admin updates
CREATE POLICY "Service role can update shop previews"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-previews');

-- Allow admin deletes
CREATE POLICY "Service role can delete shop previews"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-previews');