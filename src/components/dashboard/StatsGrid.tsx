import {
  Boxes,
  Warehouse,
  Building2,
  DollarSign,
} from "lucide-react";

import StatCard from "./StatCard";

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-6">

      <StatCard
        title="إجمالي المنتجات"
        value="1,254"
        icon={<Boxes size={26} />}
        color="bg-blue-600"
      />

      <StatCard
        title="المستودعات"
        value="8"
        icon={<Warehouse size={26} />}
        color="bg-green-600"
      />

      <StatCard
        title="الفروع"
        value="5"
        icon={<Building2 size={26} />}
        color="bg-orange-500"
      />

      <StatCard
        title="قيمة المخزون"
        value="1,280,000 ريال"
        icon={<DollarSign size={26} />}
        color="bg-purple-600"
      />

    </div>
  );
}
