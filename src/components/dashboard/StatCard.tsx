import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
};

export default function StatCard({
  title,
  value,
  icon,
  color = "bg-blue-500",
}: Props) {
  return (
    <div className="rounded-xl bg-white shadow-sm border p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between">

        <div>
          <p className="text-gray-500 text-sm">
            {title}
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {value}
          </h2>
        </div>

        <div
          className={`w-14 h-14 rounded-xl text-white flex items-center justify-center ${color}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}