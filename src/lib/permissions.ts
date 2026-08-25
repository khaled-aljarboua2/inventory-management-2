import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  STOCK_VIEW: "stock.view",
  STOCK_COUNT: "stock.count",
  STOCK_ADJUST: "stock.adjust",
  STOCK_RECEIVE: "stock.receive",

  TRANSFERS_VIEW: "transfers.view",
  TRANSFERS_CREATE: "transfers.create",
  TRANSFERS_UPDATE: "transfers.update",
  TRANSFERS_APPROVE: "transfers.approve",
  TRANSFERS_PREPARE: "transfers.prepare",
  TRANSFERS_SHIP: "transfers.ship",
  TRANSFERS_RECEIVE: "transfers.receive",
  TRANSFERS_CANCEL: "transfers.cancel",
  TRANSFERS_DELETE: "transfers.delete",

  PURCHASES_VIEW: "purchases.view",
  PURCHASES_CREATE: "purchases.create",
  PURCHASES_UPDATE: "purchases.update",
  PURCHASES_APPROVE: "purchases.approve",
  PURCHASES_CANCEL: "purchases.cancel",
  PURCHASES_DELETE: "purchases.delete",

  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_UPDATE: "suppliers.update",
  SUPPLIERS_DELETE: "suppliers.delete",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",

  LOCATIONS_VIEW: "locations.view",
  LOCATIONS_CREATE: "locations.create",
  LOCATIONS_UPDATE: "locations.update",
  LOCATIONS_DELETE: "locations.delete",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_DISABLE: "users.disable",
  USERS_MANAGE_ACCESS: "users.manage_access",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",
} as const;

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const {
    data: profile,
    error,
  } = await supabase
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
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    ...profile,
    roles: firstRelation(profile.roles),
  };
}

export async function getCurrentPermissions(): Promise<Set<string>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Set<string>();
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_current_user_permissions"
  );

  if (error || !data) {
    return new Set<string>();
  }

  const rows = data as Array<{
    permission_code: string;
  }>;

  return new Set<string>(
    rows.map(
      (item) => item.permission_code
    )
  );
}

export async function hasPermission(
  permissionCode: string
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissions.has(permissionCode);
}

export async function hasAnyPermission(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissionCodes.some((permission) =>
    permissions.has(permission)
  );
}

export async function hasAllPermissions(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissionCodes.every((permission) =>
    permissions.has(permission)
  );
}