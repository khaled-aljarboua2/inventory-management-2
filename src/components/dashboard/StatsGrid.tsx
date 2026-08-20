import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  color?: string;
};

export default function StatCard({
  title,
  value,
  description = "محدث حاليًا",
  icon,
  color = "blue",
}: Props) {
  const themes: Record<
    string,
    {
      iconBg: string;
      iconText: string;
      accent: string;
      dot: string;
    }
  > = {
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      accent: "bg-blue-600",
      dot: "bg-blue-500",
    },

    green: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      accent: "bg-emerald-600",
      dot: "bg-emerald-500",
    },

    orange: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      accent: "bg-amber-500",
      dot: "bg-amber-500",
    },

    purple: {
      iconBg: "bg-violet-50",
      iconText: "text-violet-600",
      accent: "bg-violet-600",
      dot: "bg-violet-500",
    },
  };

  const theme = themes[color] ?? themes.blue;

  return (
    <div
      className="
        group
        relative
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
      "
    >
      {/* الخط الجانبي */}

      <div
        className={`
          absolute
          right-0
          top-0
          h-full
          w-[3px]
          ${theme.accent}
        `}
      />

      <div className="p-5 sm:p-6">
        {/* العنوان والأيقونة */}

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${theme.iconBg}
                ${theme.iconText}
                transition-transform
                duration-200
                group-hover:scale-105
              `}
            >
              {icon}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">
                {title}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                ملخص النظام
              </p>
            </div>
          </div>
        </div>

        {/* الرقم */}

        <div className="mt-6">
          <h2
            className="
              truncate
              text-4xl
              font-bold
              leading-none
              tracking-tight
              text-slate-950
              sm:text-[42px]
            "
          >
            {value}
          </h2>
        </div>

        {/* الوصف */}

        <div className="mt-5 flex min-w-0 items-center gap-2">
          <span
            className={`
              h-1.5
              w-1.5
              shrink-0
              rounded-full
              ${theme.dot}
            `}
          />

          <span className="truncate text-xs font-medium text-slate-500">
            {description}
          </span>
        </div>
      </div>
    </div>
  );
}