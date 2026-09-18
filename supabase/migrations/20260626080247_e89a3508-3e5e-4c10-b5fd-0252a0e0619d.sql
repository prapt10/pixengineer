-- Security fixes for 7 findings

-- =============================================
-- 1) has_role: move SECURITY DEFINER function out of exposed (public) API schema
-- =============================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Repoint all RLS policies that referenced public.has_role to private.has_role

-- blogs
DROP POLICY IF EXISTS "Admins can manage blogs" ON public.blogs;
CREATE POLICY "Admins can manage blogs" ON public.blogs
  FOR ALL TO public
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- output_formats
DROP POLICY IF EXISTS "Admins can manage formats" ON public.output_formats;
CREATE POLICY "Admins can manage formats" ON public.output_formats
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- platform_config (will be re-created below too, but first remove dependent policy)
DROP POLICY IF EXISTS "Admins can manage config" ON public.platform_config;
DROP POLICY IF EXISTS "Anyone can view config" ON public.platform_config;

-- Drop the old public-schema function now that nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- =============================================
-- 2) platform_config public exposure -> restrict SELECT
-- Allow public access only to pricing-related rows (needed for unauthenticated Pricing page),
-- and full read access to authenticated users. Admin manage policy recreated.
-- =============================================
CREATE POLICY "Public can view pricing config" ON public.platform_config
  FOR SELECT TO anon, authenticated
  USING (category = 'pricing');

CREATE POLICY "Authenticated can view all config" ON public.platform_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage config" ON public.platform_config
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================
-- 3) uploads bucket: add missing UPDATE policy
-- =============================================
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =============================================
-- 4) Public bucket allows listing: drop broad SELECT policy on email-assets.
-- Public bucket files remain accessible via their public URLs (which bypass RLS),
-- but the storage.objects listing endpoint will no longer return all files.
-- =============================================
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
