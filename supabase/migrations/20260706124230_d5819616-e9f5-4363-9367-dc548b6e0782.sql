
DROP POLICY IF EXISTS "Admins manage all credentials" ON public.peerup_circle_credentials;
CREATE POLICY "Admins manage all credentials"
ON public.peerup_circle_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
