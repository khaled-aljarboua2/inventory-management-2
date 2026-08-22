<div dir="rtl">

# 📦 Inventory Management System

نظام احترافي ومتكامل لإدارة المخزون متعدد الشركات والفروع والمستودعات وطلبات النقل والتقارير واستيراد المنتجات.

---

## 📋 عن المشروع

**Inventory Management System** هو نظام ويب متكامل لإدارة المخزون والعمليات التشغيلية، مصمم للشركات والمؤسسات التي تمتلك عدة فروع ومستودعات وتحتاج إلى منصة مركزية لإدارة المنتجات والمخزون وعمليات النقل والمستخدمين والصلاحيات والتقارير.

يهدف النظام إلى توفير حل مركزي وسهل الاستخدام وقابل للتوسع لإدارة العمليات اليومية المتعلقة بالمخزون.

---

## 🎯 أهداف النظام

- توحيد إدارة المخزون في منصة واحدة.
- تقليل الأخطاء اليدوية.
- تسهيل نقل المنتجات بين الفروع والمستودعات.
- تحسين متابعة المخزون.
- إدارة المنتجات بشكل مركزي.
- استيراد المنتجات بكميات كبيرة.
- توفير تقارير تشغيلية وإدارية.
- إدارة المستخدمين والأدوار والصلاحيات.
- دعم تعدد الشركات والمواقع.
- عزل بيانات كل شركة.
- توفير لوحة تحكم مركزية.
- بناء نظام قابل للتوسع مستقبلًا.

---

## ✨ المزايا الرئيسية

### 📦 إدارة المنتجات

- إضافة المنتجات.
- تعديل المنتجات.
- عرض تفاصيل المنتجات.
- البحث عن المنتجات.
- تفعيل وتعطيل المنتجات.
- إدارة بيانات المنتجات.
- دعم SKU.
- دعم Barcode.
- ربط المنتجات بالمخزون.
- تصنيف المنتجات.
- متابعة حالة المنتجات.

### 📥 استيراد المنتجات

يدعم النظام استيراد المنتجات بشكل جماعي من الملفات بدل إدخال كل منتج يدويًا.

يدعم الاستيراد:

- Excel.
- CSV.

وتشمل عملية الاستيراد:

- رفع الملف.
- قراءة البيانات.
- التحقق من صحة البيانات.
- اكتشاف المنتجات المكررة.
- التحقق من SKU.
- التحقق من Barcode.
- اكتشاف الحقول الناقصة.
- عرض الأخطاء.
- مراجعة البيانات قبل الاعتماد.
- إضافة المنتجات دفعة واحدة.

مثال على بيانات الاستيراد:

```text
SKU
Product Name
Description
Category
Unit
Barcode
Minimum Stock
```

### 🏢 إدارة الفروع

- إنشاء الفروع.
- تعديل الفروع.
- عرض الفروع.
- تفعيل وتعطيل الفروع.
- ربط المستخدمين بالفروع.
- استخدام الفروع في طلبات النقل.
- متابعة العمليات الخاصة بالفرع.

### 🏭 إدارة المستودعات

- إنشاء المستودعات.
- تعديل المستودعات.
- عرض المستودعات.
- تفعيل وتعطيل المستودعات.
- تخزين المنتجات.
- استقبال المنتجات.
- إرسال المنتجات.
- تنفيذ عمليات النقل.
- متابعة المخزون.

### 📊 إدارة المخزون

- متابعة الكميات الحالية.
- متابعة المخزون حسب الموقع.
- المنتجات منخفضة المخزون.
- المنتجات النافدة.
- حركات المخزون.
- عمليات الاستلام.
- عمليات الصرف.
- عمليات النقل.
- الجرد.
- التسويات.
- سجل حركة المنتجات.

---

## 🔄 طلبات نقل المخزون

تسمح طلبات النقل بنقل المنتجات بين مواقع المؤسسة.

مثال:

```text
المستودع الرئيسي
       ↓
    طلب نقل
       ↓
      الفرع
```

أو:

```text
فرع A
  ↓
طلب نقل
  ↓
فرع B
```

### دورة طلب النقل

```text
Pending
   ↓
Approved
   ↓
Preparing
   ↓
Shipped
   ↓
In Transit
   ↓
Received
```

وفي حالة الإلغاء:

```text
Valid Stage
     ↓
Cancelled
```

### حالات طلبات النقل

| الحالة | الوصف |
|---|---|
| `pending` | طلب جديد بانتظار الإجراء |
| `approved` | تمت الموافقة على الطلب |
| `preparing` | الطلب قيد التجهيز |
| `shipped` | تم شحن الطلب |
| `in_transit` | الطلب قيد النقل |
| `received` | تم استلام الطلب |
| `cancelled` | تم إلغاء الطلب |

---

## 📈 التقارير

يوفر النظام نظام تقارير لمتابعة العمليات والبيانات التشغيلية.

### تقارير المنتجات

- قائمة المنتجات.
- المنتجات النشطة.
- المنتجات غير النشطة.
- المنتجات منخفضة المخزون.
- المنتجات النافدة.
- حركة المنتجات.

### تقارير المخزون

- المخزون الحالي.
- المخزون حسب الفرع.
- المخزون حسب المستودع.
- قيمة المخزون.
- المنتجات منخفضة المخزون.
- حركة المخزون.
- عمليات الاستلام.
- عمليات الصرف.
- عمليات الجرد.
- عمليات التسوية.

### تقارير طلبات النقل

- إجمالي طلبات النقل.
- الطلبات المعلقة.
- الطلبات المعتمدة.
- الطلبات قيد التجهيز.
- الطلبات المشحونة.
- الطلبات قيد النقل.
- الطلبات المستلمة.
- الطلبات الملغاة.
- حركة النقل بين المواقع.
- تفاصيل طلبات النقل.

### تقارير الفروع والمستودعات

- حركة المخزون لكل فرع.
- حركة المخزون لكل مستودع.
- المنتجات الموجودة في كل موقع.
- عمليات النقل لكل موقع.
- مؤشرات أداء المواقع.

### تصفية التقارير

يمكن تصفية التقارير حسب:

- التاريخ.
- الشركة.
- الفرع.
- المستودع.
- المنتج.
- الحالة.
- المستخدم.

### تصدير التقارير

يمكن دعم تصدير التقارير مستقبلًا إلى:

- Excel.
- CSV.
- PDF.

---

## 👥 إدارة المستخدمين

يدعم النظام إدارة المستخدمين داخل المؤسسة.

يمكن ربط المستخدم بـ:

- شركة.
- فرع.
- مستودع.
- دور وظيفي.
- صلاحيات محددة.

---

## 🔐 الأدوار والصلاحيات

يعتمد النظام على **Role-Based Access Control** للتحكم في صلاحيات المستخدمين.

يمكن أن تتضمن الأدوار:

- Admin.
- General Manager.
- Manager.
- Branch.
- Warehouse.
- Employee.

وتختلف صلاحيات المستخدم حسب:

- الدور.
- الشركة.
- الفرع.
- الموقع.
- العمليات المسموح بها.

---

## 🏢 تعدد الشركات

النظام مصمم لدعم **Multi-Company Architecture**.

يتم ربط البيانات بالشركة من خلال:

```text
company_id
```

مثال:

```text
Company A
├── Users
├── Branches
├── Warehouses
├── Products
└── Inventory

Company B
├── Users
├── Branches
├── Warehouses
├── Products
└── Inventory
```

ويهدف ذلك إلى عزل بيانات كل شركة عن الأخرى.

---

## 🖥️ لوحة التحكم

توفر لوحة التحكم نظرة سريعة على حالة النظام.

يمكن أن تعرض:

- إجمالي المنتجات.
- إجمالي طلبات النقل.
- الفروع.
- المستودعات.
- قيمة المخزون.
- حالات طلبات النقل.
- آخر طلبات النقل.
- آخر العمليات.
- مؤشرات المخزون.

وتكون الواجهة متجاوبة مع:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

---

## 🗄️ قاعدة البيانات

يعتمد النظام على **PostgreSQL** من خلال **Supabase**.

من الكيانات الأساسية:

```text
companies
users
roles
locations
products
transfer_requests
transfer_items
inventory
inventory_transactions
```

### العلاقات الأساسية

```text
Company
   │
   ├── Users
   │
   ├── Locations
   │      ├── Branch
   │      └── Warehouse
   │
   └── Products
          │
          └── Inventory
```

طلبات النقل:

```text
Transfer Request
   ├── From Location
   ├── To Location
   ├── Requested By
   ├── Approved By
   ├── Prepared By
   └── Received By
```

---

## 📍 المواقع

يستخدم النظام مفهوم المواقع لإدارة الفروع والمستودعات.

أنواع المواقع:

```text
branch
warehouse
```

ويتم ربط الموقع بالشركة باستخدام:

```text
company_id
```

---

## 🔄 Transfer Requests

يحتوي طلب النقل على بيانات تشغيلية مثل:

```text
id
request_number
from_location_id
to_location_id
status
requested_by
approved_by
prepared_by
received_by
request_date
approved_date
shipped_date
received_date
notes
created_at
updated_at
```

---

## 🔒 Row Level Security

يستخدم النظام **Row Level Security (RLS)** لحماية بيانات المستخدمين والشركات.

الهدف هو منع المستخدم من الوصول إلى بيانات خارج:

- شركته.
- موقعه.
- دوره.
- صلاحياته.

التدفق المنطقي:

```text
User
 ↓
Authentication
 ↓
Authorization
 ↓
Company / Location
 ↓
Allowed Data
```

---

## 🔑 Authentication

يستخدم النظام **Supabase Authentication** لإدارة:

- تسجيل الدخول.
- تسجيل الخروج.
- الجلسات.
- التحقق من المستخدم.
- حماية الصفحات.
- التحكم في الوصول.

---

## 🛡️ الأمان

يعتمد النظام على عدة طبقات من الحماية:

- Authentication.
- Authorization.
- Role-Based Access Control.
- Row Level Security.
- Company Data Isolation.
- Location-Based Access.
- Server-side validation.
- Environment Variables.

لا يجب وضع الأسرار أو المفاتيح الحساسة داخل المستودع.

---

## 🏗️ المعمارية

```text
                    ┌──────────────────┐
                    │       User       │
                    │ Mobile / Desktop │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     Next.js      │
                    │   Application    │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐        ┌────────────────┐
        │ Authentication│        │    Supabase    │
        │               │        │   PostgreSQL   │
        └───────────────┘        └───────┬────────┘
                                         │
                                         ▼
                                ┌────────────────┐
                                │      RLS       │
                                │ Data Security  │
                                └────────────────┘
```

---

## 🛠️ التقنيات المستخدمة

### Frontend

- Next.js 16.
- React.
- TypeScript.
- Tailwind CSS.
- Lucide React.

### Backend / Database

- Supabase.
- PostgreSQL.
- Supabase Authentication.
- Row Level Security.

### Development

- Git.
- GitHub.
- npm.

### Deployment

- Vercel.

---

## 📱 Responsive Design

النظام مصمم للعمل على:

- الهواتف.
- الأجهزة اللوحية.
- أجهزة الكمبيوتر.
- الشاشات الكبيرة.

ويتم تغيير تخطيط الواجهة حسب حجم الشاشة مع الحفاظ على سهولة الاستخدام.

---

## 📁 هيكل المشروع

```text
inventory-management-2/
│
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── transfers/
│   │   ├── branches/
│   │   ├── users/
│   │   ├── roles/
│   │   └── ...
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── products/
│   │   ├── transfers/
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   └── ...
│   │
│   └── ...
│
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

---

## ⚙️ المتطلبات

لتشغيل المشروع تحتاج إلى:

- Node.js.
- npm.
- Git.
- حساب Supabase.
- مشروع Supabase فعال.

---

## 🚀 تشغيل المشروع محليًا

### استنساخ المستودع

```bash
git clone https://github.com/khaled-aljarboua2/inventory-management-2.git
```

### الدخول إلى المشروع

```bash
cd inventory-management-2
```

### تثبيت الحزم

```bash
npm install
```

---

## 🔑 Environment Variables

أنشئ ملف:

```text
.env.local
```

وأضف:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

وأي متغيرات إضافية يحتاجها المشروع يجب إضافتها إلى بيئة التشغيل دون رفعها إلى GitHub.

---

## ▶️ تشغيل المشروع

تشغيل بيئة التطوير:

```bash
npm run dev
```

ثم:

```text
http://localhost:3000
```

---

## 🏭 Production Build

إنشاء نسخة الإنتاج:

```bash
npm run build
```

تشغيل نسخة الإنتاج:

```bash
npm start
```

---

## 🔍 فحص المشروع

قبل Deployment يفضل تشغيل:

```bash
npm run build
```

للتأكد من عدم وجود:

- TypeScript Errors.
- Build Errors.
- Import Errors.
- مشاكل في Server Components.
- مشاكل في التجميع.

---

## 🌐 Deployment

يمكن نشر المشروع باستخدام Vercel.

تدفق النشر:

```text
Developer
    ↓
GitHub
    ↓
Commit
    ↓
Vercel
    ↓
Build
    ↓
Deployment
```

عند تفعيل الربط بين GitHub وVercel يمكن تنفيذ Deployment تلقائيًا عند تحديث الفرع الرئيسي.

---

## 🔄 Git Workflow

### تحديث نسخة المشروع من GitHub

```bash
git pull origin main
```

### فحص حالة المشروع

```bash
git status
```

### إضافة التعديلات

```bash
git add .
```

### إنشاء Commit

```bash
git commit -m "Update dashboard"
```

### رفع التعديلات

```bash
git push origin main
```

---

## 🧪 الاختبارات

قبل اعتماد أي تغيير مهم يجب اختبار:

### Authentication

- تسجيل الدخول.
- تسجيل الخروج.
- حماية الصفحات.
- الجلسات.
- صلاحيات المستخدم.

### Products

- إضافة منتج.
- تعديل منتج.
- تعطيل منتج.
- البحث.
- استيراد المنتجات.
- التحقق من بيانات الاستيراد.

### Locations

- إنشاء فرع.
- إنشاء مستودع.
- تعديل الموقع.
- تفعيل وتعطيل الموقع.

### Transfers

- إنشاء طلب نقل.
- اعتماد الطلب.
- تجهيز الطلب.
- شحن الطلب.
- نقل الطلب.
- استلام الطلب.
- إلغاء الطلب.

### Reports

- عرض التقرير.
- التصفية.
- التحقق من البيانات.
- التصدير عند توفره.

### Permissions

التأكد من أن المستخدم لا يستطيع الوصول إلى بيانات أو عمليات خارج صلاحياته.

---

## ⚡ الأداء

يركز النظام على الأداء وقابلية التوسع.

من ممارسات تحسين الأداء:

- استخدام Server Components عند الحاجة.
- تنفيذ الاستعلامات المستقلة بالتوازي.
- تحديد الأعمدة المطلوبة من قاعدة البيانات.
- تجنب جلب بيانات غير مستخدمة.
- استخدام Database Indexes.
- استخدام Pagination عند زيادة البيانات.
- استخدام Caching للبيانات المناسبة.
- تقليل JavaScript غير الضروري.
- تحسين الصور والملفات الثابتة.
- الاستفادة من Next.js Prefetching.

---

## 🗄️ تحسين أداء قاعدة البيانات

عند زيادة حجم البيانات يجب الاهتمام بـ:

- Query Optimization.
- Database Indexes.
- Pagination.
- Foreign Keys.
- RLS Optimization.
- تقليل عدد الاستعلامات.
- تقليل البيانات المسترجعة.
- الاستفادة من الاستعلامات المتوازية.

أعمدة قد تحتاج إلى Indexes حسب الاستخدام:

```text
company_id
location_id
status
is_active
created_at
from_location_id
to_location_id
```

> يتم إنشاء الـIndexes بناءً على الاستعلامات الفعلية وحجم البيانات.

---

## 💾 النسخ الاحتياطي

قبل أي تعديل كبير على قاعدة البيانات:

```text
Backup
   ↓
Migration
   ↓
Test
   ↓
Verify
   ↓
Production
```

لا يتم حذف أو تعديل بيانات Production بشكل خطير دون وجود نسخة احتياطية.

---

## 🔄 Database Migrations

عند تغيير قاعدة البيانات:

1. إنشاء Migration.
2. اختبار Migration.
3. التأكد من العلاقات.
4. مراجعة RLS.
5. اختبار التطبيق.
6. تطبيق التغيير على Production.

---

## 🧰 استكشاف الأخطاء

عند وجود مشكلة في المشروع:

### 1. تحديث المشروع

```bash
git pull origin main
```

### 2. تثبيت الحزم

```bash
npm install
```

### 3. تشغيل Build

```bash
npm run build
```

### 4. فحص Environment Variables

تأكد من أن:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

موجودة وصحيحة.

### 5. فحص Supabase

تحقق من:

- Authentication.
- RLS.
- Database.
- Tables.
- Relationships.
- Policies.

---

## 🚫 حماية الأسرار

لا ترفع إلى GitHub:

```text
.env
.env.local
.env.production
```

ولا تضع داخل الكود:

```text
Passwords
API Keys
Service Role Keys
Database Credentials
Access Tokens
Private Secrets
```

يجب استخدام Environment Variables.

---

## 🗺️ Roadmap

### المرحلة الحالية

- [x] Authentication.
- [x] Users.
- [x] Roles.
- [x] Permissions.
- [x] Products.
- [x] Branches.
- [x] Warehouses.
- [x] Inventory foundation.
- [x] Transfer Requests.
- [x] Dashboard.
- [x] Supabase integration.
- [x] Responsive UI.
- [x] Company-based data structure.

### التطوير القادم

- [ ] تطوير Dashboard.
- [ ] نظام تقارير متقدم.
- [ ] استيراد المنتجات بشكل متكامل.
- [ ] تصدير التقارير.
- [ ] تنبيهات انخفاض المخزون.
- [ ] تحسين سجل حركة المخزون.
- [ ] Barcode.
- [ ] تقارير متقدمة للفروع والمستودعات.
- [ ] تحسينات متقدمة للصلاحيات.

### المستقبل

- [ ] النظام المحاسبي.
- [ ] الفواتير.
- [ ] المصروفات.
- [ ] الإيرادات.
- [ ] الموردون.
- [ ] العملاء.
- [ ] التقارير المالية.
- [ ] التحليلات المتقدمة.
- [ ] الإشعارات.
- [ ] التكاملات الخارجية.

---

## 💰 النظام المحاسبي المستقبلي

من المخطط دعم نظام محاسبي متكامل مستقبلًا، وقد يشمل:

- الحسابات.
- القيود اليومية.
- الفواتير.
- المبيعات.
- المشتريات.
- المصروفات.
- الإيرادات.
- الموردين.
- العملاء.
- التقارير المالية.
- الأرباح والخسائر.
- التدفقات النقدية.

وسيتم تصميم النظام المحاسبي بحيث يكون متكاملًا مع حركة المخزون.

---

## 🧩 مبادئ التطوير

يركز تطوير المشروع على:

```text
Security
Performance
Scalability
Maintainability
Usability
Data Integrity
```

مع المحافظة على فصل واضح بين:

```text
UI
Business Logic
Database
Authentication
Authorization
```

---

## 📌 قواعد التطوير

قبل تعديل أي جزء حساس:

1. فهم الكود الحالي.
2. فهم قاعدة البيانات والعلاقات.
3. عدم تغيير أسماء الجداول أو الأعمدة دون مراجعة الاستخدامات.
4. عدم تعديل RLS بشكل عشوائي.
5. اختبار الصلاحيات.
6. اختبار Build.
7. اختبار Deployment.
8. الحفاظ على التوافق مع الأجهزة المختلفة.
9. عدم رفع الأسرار إلى GitHub.
10. أخذ نسخة احتياطية قبل التغييرات الكبيرة.

---

## 🛡️ Database Safety

عند تنفيذ تغييرات كبيرة:

```text
Backup
   ↓
Migration
   ↓
Verification
   ↓
Testing
   ↓
Production
```

يجب الحفاظ على سلامة البيانات وعدم تنفيذ تغييرات مدمرة دون نسخة احتياطية.

---

## 🌐 بيئة الإنتاج

البنية الأساسية:

```text
                    Users
                      │
             ┌────────┴────────┐
             │                 │
          Desktop           Mobile
             │                 │
             └────────┬────────┘
                      │
                      ▼
                   Next.js
                      │
                      ▼
                    Vercel
                      │
                      ▼
                  Supabase
                      │
              ┌───────┴───────┐
              │               │
          PostgreSQL        Auth
              │
              ▼
        Inventory System
```

---

## 📄 License

هذا المشروع **خاص ومملوك لصاحب المشروع**.

لا يسمح بنسخ أو إعادة توزيع أو بيع أو استخدام الكود أو أجزاء منه دون الحصول على إذن مسبق من صاحب المشروع.

---

## 👨‍💻 Project Information

**Project:** Inventory Management System

**Type:** Web-based Inventory Management Platform

**Architecture:** Multi-Company / Multi-Location

**Frontend:** Next.js + React + TypeScript

**Styling:** Tailwind CSS

**Backend / Database:** Supabase + PostgreSQL

**Authentication:** Supabase Authentication

**Security:** Row Level Security + Role-Based Access Control

**Deployment:** Vercel

---

## 🚀 Project Status

```text
Active Development
```

يتم تطوير النظام بشكل مستمر وإضافة وظائف جديدة وتحسينات في الأداء والأمان وتجربة المستخدم.

</div>