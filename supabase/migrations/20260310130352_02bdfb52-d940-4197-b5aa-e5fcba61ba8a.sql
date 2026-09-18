
CREATE TABLE public.app_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled App',
  prompt text NOT NULL DEFAULT '',
  framework text NOT NULL DEFAULT 'nextjs',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own builds" ON public.app_builds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own builds" ON public.app_builds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own builds" ON public.app_builds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own builds" ON public.app_builds FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_app_builds_updated_at BEFORE UPDATE ON public.app_builds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
