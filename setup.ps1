$dirs = @(
"src/app/(auth)/login",
"src/app/(dashboard)/dashboard",
"src/components/ui",
"src/components/layout",
"src/features/auth/components",
"src/features/auth/hooks",
"src/features/auth/services",
"src/features/auth/types",
"src/features/auth/schemas",
"src/features/branches/components",
"src/features/branches/services",
"src/features/categories/components",
"src/features/categories/services",
"src/features/products/components",
"src/features/products/services",
"src/features/warehouses/components",
"src/features/warehouses/services",
"src/features/inventory/components",
"src/features/inventory/services",
"src/features/users/components",
"src/features/users/services",
"src/features/roles/components",
"src/features/roles/services",
"src/features/settings/components",
"src/features/settings/services",
"src/lib",
"src/services",
"src/store",
"src/types",
"src/utils",
"src/constants",
"src/hooks",
"src/styles",
"src/middleware"
)

$files = @(
"src/lib/supabase.ts",
"src/middleware/auth.ts",
"src/services/api.ts",
"src/store/index.ts",
"src/types/index.ts",
"src/constants/index.ts",
"src/hooks/index.ts",
"src/utils/index.ts",
"src/styles/index.css",
"src/app/(auth)/login/page.tsx",
"src/app/(dashboard)/dashboard/page.tsx"
)

foreach ($d in $dirs){
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

foreach ($f in $files){
    New-Item -ItemType File -Force -Path $f | Out-Null
}

Write-Host "Project Structure Created Successfully ✅"
