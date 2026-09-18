
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, free_credits, credit_balance, free_credits_reset_at)
  VALUES (NEW.id, 0, 0, now());
  RETURN NEW;
END;
$function$;
