
-- Create platform_config table for admin-editable settings
CREATE TABLE public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (needed by edge functions via service role, and overview display)
CREATE POLICY "Anyone can view config" ON public.platform_config
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage config" ON public.platform_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default config values
INSERT INTO public.platform_config (key, value, label, category) VALUES
  ('ai_provider', 'Anthropic', 'AI Provider', 'ai'),
  ('ai_model', 'claude-sonnet-4-20250514', 'AI Model', 'ai'),
  ('ai_max_tokens', '8192', 'Max Output Tokens', 'ai'),
  ('token_cost_per_unit', '0.5', 'Cost per Generation (₹)', 'pricing'),
  ('token_price_per_unit', '1.0', 'Price per Token (₹)', 'pricing'),
  ('default_free_trials', '3', 'Free Trials per New User', 'pricing');
