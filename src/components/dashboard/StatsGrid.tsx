import {
  Boxes,
  Warehouse,
  Building2,
  DollarSign,
} from "lucide-react";

import StatCard from "./StatCard";

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

      <StatCard
        title="إجمالي المنتجات"
        value="1,254"
        icon={<Boxes size={24} strokeWidth={1.8} />}
        color="blue"
      />

      <StatCard
        title="المستودعات"
        value="8"
        icon={<Warehouse size={24} strokeWidth={1.8} />}
        color="green"
      />

      <StatCard
        title="الفروع"
        value="5"
        icon={<Building2 size={24} strokeWidth={1.8} />}
        color="orange"
      />

      <StatCard
        title="قيمة المخزون"
        value="1,280,000 ريال"
        icon={<DollarSign size={24} strokeWidth={1.8} />}
        color="purple"
      />

    </div>
  );
}
