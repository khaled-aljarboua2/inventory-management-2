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

type CurrentUserProfile = {
  id: string;
  auth_user_id: string;
  company_id: string;
  role_id: string | null;
  location_id: string | null;
  full_name: string;
  username: string | null;
  email: string;
  is_active: boolean;
  roles: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

type CurrentUserContext = {
  profile: CurrentUserProfile | null;
  permissions: Set<string>;
};

/**
 * يجلب المستخدم الحالي + صلاحياته من نفس جلسة Supabase.
 *
 * الهدف:
 * - عدم استدعاء auth.getUser() أكثر من مرة في نفس العملية.
 * - تحميل profile والصلاحيات بالتوازي بعد الحصول على المستخدم.
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      profile: null,
      permissions: new Set<string>(),
    };
  }

  const [profileResult, permissionsResult] =
    await Promise.all([
      supabase
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
        .single(),

      supabase.rpc(
        "get_current_user_permissions"
      ),
    ]);

  const profile =
    !profileResult.error &&
    profileResult.data
      ? {
          ...profileResult.data,
          roles: firstRelation(
            profileResult.data.roles
          ),
        }
      : null;

  const permissions = new Set<string>();

  if (
    !permissionsResult.error &&
    permissionsResult.data
  ) {
    const rows =
      permissionsResult.data as Array<{
        permission_code: string;
      }>;

    for (const row of rows) {
      if (row.permission_code) {
        permissions.add(
          row.permission_code
        );
      }
    }
  }

  return {
    profile,
    permissions,
  };
}

/**
 * توافق مع الاستدعاءات الحالية في المشروع.
 */
export async function getCurrentUserProfile() {
  const context =
    await getCurrentUserContext();

  return context.profile;
}

/**
 * توافق مع الاستدعاءات الحالية في المشروع.
 */
export async function getCurrentPermissions(): Promise<
  Set<string>
> {
  const context =
    await getCurrentUserContext();

  return context.permissions;
}

export async function hasPermission(
  permissionCode: string
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissions.has(
    permissionCode
  );
}

export async function hasAnyPermission(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissionCodes.some(
    (permission) =>
      permissions.has(permission)
  );
}

export async function hasAllPermissions(
  permissionCodes: string[]
): Promise<boolean> {
  const permissions =
    await getCurrentPermissions();

  return permissionCodes.every(
    (permission) =>
      permissions.has(permission)
  );
}
