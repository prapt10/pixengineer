
-- Add prompt engineer config entries
INSERT INTO public.platform_config (key, value, label, category) VALUES
  ('prompt_engineer_model', 'google/gemini-3-flash-preview', 'Prompt Engineer AI Model', 'ai'),
  ('prompt_engineer_enabled', 'true', 'Prompt Engineer Tool Enabled', 'prompt_engineer'),
  ('prompt_engineer_max_messages', '50', 'Max Messages Per Session', 'prompt_engineer')
ON CONFLICT DO NOTHING;
