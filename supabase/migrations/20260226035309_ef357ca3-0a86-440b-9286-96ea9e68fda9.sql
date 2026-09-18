
-- Create prompt_history table
CREATE TABLE public.prompt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  mode TEXT NOT NULL DEFAULT 'generate',
  category TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own history
CREATE POLICY "Users can view own prompt history"
  ON public.prompt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt history"
  ON public.prompt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt history"
  ON public.prompt_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt history"
  ON public.prompt_history FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_prompt_history_updated_at
  BEFORE UPDATE ON public.prompt_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
