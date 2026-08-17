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
  color = "blue",
}: Props) {
  const themes: Record<
    string,
    {
      icon: string;
      glow: string;
      hover: string;
      line: string;
    }
  > = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      glow: "group-hover:bg-blue-100",
      hover: "group-hover:border-blue-200",
      line: "from-blue-500 to-indigo-500",
    },

    green: {
      icon: "bg-emerald-50 text-emerald-600",
      glow: "group-hover:bg-emerald-100",
      hover: "group-hover:border-emerald-200",
      line: "from-emerald-500 to-teal-500",
    },

    orange: {
      icon: "bg-amber-50 text-amber-600",
      glow: "group-hover:bg-amber-100",
      hover: "group-hover:border-amber-200",
      line: "from-amber-500 to-orange-500",
    },

    purple: {
      icon: "bg-violet-50 text-violet-600",
      glow: "group-hover:bg-violet-100",
      hover: "group-hover:border-violet-200",
      line: "from-violet-500 to-indigo-500",
    },
  };

  const theme = themes[color] ?? themes.blue;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 ${theme.hover}`}
    >
      {/* خط علوي */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${theme.line} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />

      {/* تأثير خفيف بالخلفية */}
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-0 transition-all duration-500 group-hover:opacity-60 ${theme.glow}`}
      />

      <div className="relative flex items-center justify-between gap-4">
        {/* البيانات */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-900 transition-transform duration-300 group-hover:translate-x-0.5">
            {value}
          </h2>

          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span className="text-xs text-slate-400">
              محدث حاليًا
            </span>
          </div>
        </div>

        {/* الأيقونة */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${theme.icon} group-hover:scale-110 group-hover:rotate-2`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
