
-- Rename columns in profiles
ALTER TABLE public.profiles RENAME COLUMN free_trials_remaining TO free_credits;
ALTER TABLE public.profiles RENAME COLUMN token_balance TO credit_balance;
ALTER TABLE public.profiles ALTER COLUMN free_credits SET DEFAULT 20;

-- Add free_credits_reset_at column
ALTER TABLE public.profiles ADD COLUMN free_credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Rename column in payments
ALTER TABLE public.payments RENAME COLUMN tokens TO credits;

-- Update handle_new_user to set free_credits = 20
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, free_credits, credit_balance, free_credits_reset_at)
  VALUES (NEW.id, 20, 0, now());
  RETURN NEW;
END;
$function$;

-- Update get_admin_stats to use new column names
CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_generations', (SELECT COUNT(*) FROM public.generations),
    'total_credits_purchased', (SELECT COALESCE(SUM(credit_balance), 0) FROM public.profiles),
    'total_free_credits', (SELECT COALESCE(SUM(free_credits), 0) FROM public.profiles),
    'users', (
      SELECT json_agg(json_build_object(
        'user_id', p.user_id,
        'free_credits', p.free_credits,
        'credit_balance', p.credit_balance,
        'is_active', p.is_active,
        'created_at', p.created_at,
        'generation_count', (SELECT COUNT(*) FROM public.generations g WHERE g.user_id = p.user_id)
      ))
      FROM public.profiles p
    )
  ) INTO result;

  RETURN result;
END;
$function$;
