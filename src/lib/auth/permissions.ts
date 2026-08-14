import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select(`
      id,
      auth_user_id,
      company_id,
      role_id,
      location_id,
      full_name,
      username,
      email,
      is_active,
      roles (
        id,
        name,
        description
      )
    `)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  const supabase = await createClient();

  const profile = await getCurrentUserProfile();

  if (!profile) {
    return [];
  }

  const { data: rolePermissions, error: roleError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", profile.role_id);

  if (roleError || !rolePermissions?.length) {
    return [];
  }

  const permissionIds = rolePermissions.map(
    (permission) => permission.permission_id
  );

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("code")
    .in("id", permissionIds);

  if (permissionsError || !permissions) {
    return [];
  }

  return permissions.map((permission) => permission.code);
}

export async function hasPermission(
  permissionCode: string
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();

  return permissions.includes(permissionCode);
}

export async function hasAnyPermission(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();

  return permissionCodes.some((permission) =>
    permissions.includes(permission)
  );
}

export async function hasAllPermissions(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getCurrentUserPermissions();

  return permissionCodes.every((permission) =>
    permissions.includes(permission)
  );
}
