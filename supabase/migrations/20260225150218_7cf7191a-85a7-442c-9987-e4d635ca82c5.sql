
-- Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Allow admins to view and update all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create output_formats config table
CREATE TABLE public.output_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL,
  prompt text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.output_formats ENABLE ROW LEVEL SECURITY;

-- Everyone can read active formats
CREATE POLICY "Anyone can view active formats"
ON public.output_formats FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage formats"
ON public.output_formats FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed formats
INSERT INTO public.output_formats (value, label, description, prompt, sort_order) VALUES
('html-css', 'HTML + CSS', 'Clean vanilla CSS', 'Generate clean, semantic, responsive HTML and vanilla CSS code that matches this design pixel-perfectly. Return the HTML in one block and the CSS in another block. Use modern CSS features like flexbox and grid. Use BEM naming conventions.', 1),
('html-scss', 'HTML + SCSS', 'Nested & variables', 'Generate clean, semantic, responsive HTML and SCSS code that matches this design pixel-perfectly. Return the HTML in one block and the SCSS in another block. Use SCSS features like nesting, variables, and mixins.', 2),
('html-tailwind', 'HTML + Tailwind', 'Utility-first CSS', 'Generate clean, semantic, responsive HTML with Tailwind CSS utility classes that matches this design pixel-perfectly. Return the HTML in one block (with Tailwind classes inline) and any custom CSS needed in another block.', 3),
('react-scss', 'React + SCSS', 'Component with SCSS modules', 'Generate a React functional component with SCSS module styling that matches this design pixel-perfectly. Return the JSX in one block and the SCSS in another block. Use proper React patterns and SCSS modules.', 4),
('react-tailwind', 'React + Tailwind', 'Component with Tailwind', 'Generate a React functional component with Tailwind CSS utility classes that matches this design pixel-perfectly. Return the JSX in one block and any custom CSS in another block. Use proper React patterns.', 5),
('angular-scss', 'Angular + SCSS', 'Component with SCSS', 'Generate an Angular component with SCSS styling that matches this design pixel-perfectly. Return the component HTML template in one block and the SCSS in another block. Use proper Angular patterns.', 6),
('angular-tailwind', 'Angular + Tailwind', 'Component with Tailwind', 'Generate an Angular component with Tailwind CSS utility classes that matches this design pixel-perfectly. Return the component HTML template in one block and any custom CSS in another block.', 7),
('nextjs-scss', 'Next.js + SCSS', 'Page with SCSS modules', 'Generate a Next.js page component with SCSS module styling that matches this design pixel-perfectly. Return the JSX in one block and the SCSS in another block. Use Next.js best practices.', 8),
('nextjs-tailwind', 'Next.js + Tailwind', 'Page with Tailwind', 'Generate a Next.js page component with Tailwind CSS utility classes that matches this design pixel-perfectly. Return the JSX in one block and any custom CSS in another block. Use Next.js best practices.', 9);

-- Update get_admin_stats to include is_active
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_generations', (SELECT COUNT(*) FROM public.generations),
    'total_tokens_purchased', (SELECT COALESCE(SUM(token_balance), 0) FROM public.profiles),
    'total_free_trials_remaining', (SELECT COALESCE(SUM(free_trials_remaining), 0) FROM public.profiles),
    'users', (
      SELECT json_agg(json_build_object(
        'user_id', p.user_id,
        'free_trials_remaining', p.free_trials_remaining,
        'token_balance', p.token_balance,
        'is_active', p.is_active,
        'created_at', p.created_at,
        'generation_count', (SELECT COUNT(*) FROM public.generations g WHERE g.user_id = p.user_id)
      ))
      FROM public.profiles p
    )
  ) INTO result;

  RETURN result;
END;
$$;
