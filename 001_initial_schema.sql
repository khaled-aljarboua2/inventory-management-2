-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM
-- Initial Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

create type public.inventory_transaction_type as enum (
  'opening_balance',
  'receipt',
  'issue',
  'transfer_in',
  'transfer_out',
  'adjustment',
  'return'
);

create type public.transfer_status as enum (
  'draft',
  'pending',
  'approved',
  'rejected',
  'in_transit',
  'completed',
  'cancelled'
);


-- ============================================================
-- 3. COMPANIES
-- ============================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),

  name varchar(150) not null,
  legal_name varchar(200),
  tax_number varchar(50),

  phone varchar(30),
  email varchar(150),
  address text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. BRANCHES
-- ============================================================

create table public.branches (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  code varchar(30) not null,
  name varchar(150) not null,

  phone varchar(30),
  address text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint branches_company_code_unique
    unique (company_id, code)
);


-- ============================================================
-- 5. WAREHOUSES
-- ============================================================

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  branch_id uuid not null
    references public.branches(id)
    on delete cascade,

  code varchar(30) not null,
  name varchar(150) not null,

  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouses_company_code_unique
    unique (company_id, code)
);


-- ============================================================
-- 6. CATEGORIES
-- ============================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  parent_id uuid
    references public.categories(id)
    on delete restrict,

  name varchar(150) not null,
  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_company_name_unique
    unique (company_id, name)
);


-- ============================================================
-- 7. BRANDS
-- ============================================================

create table public.brands (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name varchar(150) not null,
  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint brands_company_name_unique
    unique (company_id, name)
);


-- ============================================================
-- 8. UNITS
-- ============================================================

create table public.units (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name varchar(100) not null,
  symbol varchar(20),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint units_company_name_unique
    unique (company_id, name)
);


-- ============================================================
-- 9. PRODUCTS
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  category_id uuid
    references public.categories(id)
    on delete set null,

  brand_id uuid
    references public.brands(id)
    on delete set null,

  unit_id uuid
    references public.units(id)
    on delete restrict,

  sku varchar(100) not null,
  barcode varchar(100),

  name varchar(200) not null,
  description text,

  cost_price numeric(14,3)
    not null default 0
    check (cost_price >= 0),

  min_stock numeric(14,3)
    not null default 0
    check (min_stock >= 0),

  max_stock numeric(14,3)
    check (max_stock is null or max_stock >= min_stock),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_company_sku_unique
    unique (company_id, sku)
);


-- ============================================================
-- 10. PRODUCT BARCODE INDEX
-- ============================================================

create unique index products_company_barcode_unique
on public.products(company_id, barcode)
where barcode is not null;


-- ============================================================
-- 11. INVENTORY
-- ============================================================

create table public.inventory (
  id uuid primary key default gen_random_uuid(),

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  quantity numeric(14,3)
    not null default 0
    check (quantity >= 0),

  reserved_quantity numeric(14,3)
    not null default 0
    check (reserved_quantity >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_product_warehouse_unique
    unique (warehouse_id, product_id),

  constraint inventory_reserved_not_greater_than_quantity
    check (reserved_quantity <= quantity)
);


-- ============================================================
-- 12. INVENTORY TRANSACTIONS
-- ============================================================

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  transaction_type public.inventory_transaction_type not null,

  quantity numeric(14,3)
    not null
    check (quantity > 0),

  unit_cost numeric(14,3)
    check (unit_cost is null or unit_cost >= 0),

  reference_id uuid,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 13. STOCK TRANSFERS
-- ============================================================

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  from_warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  to_warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  status public.transfer_status not null default 'draft',

  requested_by uuid
    references auth.users(id)
    on delete set null,

  approved_by uuid
    references auth.users(id)
    on delete set null,

  notes text,

  requested_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stock_transfers_different_warehouses
    check (from_warehouse_id <> to_warehouse_id)
);


-- ============================================================
-- 14. STOCK TRANSFER ITEMS
-- ============================================================

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),

  transfer_id uuid not null
    references public.stock_transfers(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  quantity numeric(14,3)
    not null
    check (quantity > 0),

  created_at timestamptz not null default now(),

  constraint stock_transfer_product_unique
    unique (transfer_id, product_id)
);


-- ============================================================
-- 15. ROLES
-- ============================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  company_id uuid
    references public.companies(id)
    on delete cascade,

  name varchar(100) not null,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roles_company_name_unique
    unique (company_id, name)
);


-- ============================================================
-- 16. PERMISSIONS
-- ============================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),

  code varchar(100) not null unique,
  name varchar(150) not null,
  description text,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 17. ROLE PERMISSIONS
-- ============================================================

create table public.role_permissions (
  role_id uuid not null
    references public.roles(id)
    on delete cascade,

  permission_id uuid not null
    references public.permissions(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (role_id, permission_id)
);


-- ============================================================
-- 18. COMPANY MEMBERS
-- ============================================================

create table public.company_members (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role_id uuid
    references public.roles(id)
    on delete set null,

  branch_id uuid
    references public.branches(id)
    on delete set null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_members_unique_user
    unique (company_id, user_id)
);


-- ============================================================
-- 19. INDEXES
-- ============================================================

create index branches_company_id_idx
on public.branches(company_id);

create index warehouses_company_id_idx
on public.warehouses(company_id);

create index warehouses_branch_id_idx
on public.warehouses(branch_id);

create index categories_company_id_idx
on public.categories(company_id);

create index categories_parent_id_idx
on public.categories(parent_id);

create index brands_company_id_idx
on public.brands(company_id);

create index units_company_id_idx
on public.units(company_id);

create index products_company_id_idx
on public.products(company_id);

create index products_category_id_idx
on public.products(category_id);

create index products_brand_id_idx
on public.products(brand_id);

create index inventory_product_id_idx
on public.inventory(product_id);

create index inventory_warehouse_id_idx
on public.inventory(warehouse_id);

create index inventory_transactions_company_id_idx
on public.inventory_transactions(company_id);

create index inventory_transactions_product_id_idx
on public.inventory_transactions(product_id);

create index inventory_transactions_warehouse_id_idx
on public.inventory_transactions(warehouse_id);

create index inventory_transactions_created_at_idx
on public.inventory_transactions(created_at);

create index stock_transfers_company_id_idx
on public.stock_transfers(company_id);

create index stock_transfers_from_warehouse_idx
on public.stock_transfers(from_warehouse_id);

create index stock_transfers_to_warehouse_idx
on public.stock_transfers(to_warehouse_id);

create index stock_transfer_items_product_id_idx
on public.stock_transfer_items(product_id);

create index company_members_user_id_idx
on public.company_members(user_id);

create index company_members_company_id_idx
on public.company_members(company_id);

create index company_members_branch_id_idx
on public.company_members(branch_id);


-- ============================================================
-- 20. UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 21. UPDATED_AT TRIGGERS
-- ============================================================

create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row
execute function public.set_updated_at();

create trigger warehouses_set_updated_at
before update on public.warehouses
for each row
execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger brands_set_updated_at
before update on public.brands
for each row
execute function public.set_updated_at();

create trigger units_set_updated_at
before update on public.units
for each row
execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create trigger inventory_set_updated_at
before update on public.inventory
for each row
execute function public.set_updated_at();

create trigger stock_transfers_set_updated_at
before update on public.stock_transfers
for each row
execute function public.set_updated_at();

create trigger roles_set_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

create trigger company_members_set_updated_at
before update on public.company_members
for each row
execute function public.set_updated_at();


-- ============================================================
-- END OF INITIAL SCHEMA
-- ============================================================
