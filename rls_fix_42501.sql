-- ============================================================
-- FIX RLS: ALLOW ADMIN/HOST BYPASS TO PREVENT 42501
-- ============================================================

-- Function to check if user is host or admin
CREATE OR REPLACE FUNCTION public.is_host_or_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('host', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Drop old policies
DROP POLICY IF EXISTS "owner_update_properties" ON public.properties;
DROP POLICY IF EXISTS "owner_delete_properties" ON public.properties;
DROP POLICY IF EXISTS "auth_insert_properties" ON public.properties;
DROP POLICY IF EXISTS "Host can insert properties." ON public.properties;
DROP POLICY IF EXISTS "Host can update properties." ON public.properties;
DROP POLICY IF EXISTS "Host can delete properties." ON public.properties;

-- 2. Create new INSERT policy
CREATE POLICY "auth_insert_properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND (
      host_id = auth.uid() 
      OR public.is_host_or_admin()
    )
  );

-- 3. Create new UPDATE policy
CREATE POLICY "owner_update_properties"
  ON public.properties FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (
      host_id = auth.uid() 
      OR host_id IS NULL
      OR public.is_host_or_admin()
    )
  );

-- 4. Create new DELETE policy
CREATE POLICY "owner_delete_properties"
  ON public.properties FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (
      host_id = auth.uid() 
      OR host_id IS NULL
      OR public.is_host_or_admin()
    )
  );

-- 5. Force update existing null host_ids to the first admin/host
UPDATE public.properties
SET host_id = (
  SELECT id FROM public.profiles 
  WHERE role IN ('host', 'admin') 
  LIMIT 1
)
WHERE host_id IS NULL;

-- ============================================================
-- DONE ✅
-- ============================================================
