-- تسريع صفحة سجل حركات المخزون عند التصفية حسب الشركة والترتيب بالتاريخ.
CREATE INDEX IF NOT EXISTS idx_stock_transactions_company_created_at
  ON public.stock_transactions (company_id, created_at DESC);
