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
      icon: string;
      accent: string;
      dot: string;
    }
  > = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      accent: "bg-blue-600",
      dot: "bg-blue-500",
    },

    green: {
      icon: "bg-emerald-50 text-emerald-600",
      accent: "bg-emerald-600",
      dot: "bg-emerald-500",
    },

    orange: {
      icon: "bg-amber-50 text-amber-600",
      accent: "bg-amber-500",
      dot: "bg-amber-500",
    },

    purple: {
      icon: "bg-violet-50 text-violet-600",
      accent: "bg-violet-600",
      dot: "bg-violet-500",
    },
  };

  const theme =
    themes[color] ?? themes.blue;

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
        px-5
        py-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
      "
    >
      {/* ======================================================
          الخط الجانبي
      ======================================================= */}

      <div
        className={`
          absolute
          right-0
          top-0
          h-full
          w-1
          ${theme.accent}
        `}
      />

      {/* ======================================================
          الرأس
      ======================================================= */}

      <div className="relative flex items-center justify-between gap-4">
        {/* العنوان */}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            {title}
          </p>
        </div>

        {/* الأيقونة */}

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${theme.icon}
            transition-transform
            duration-200
            group-hover:scale-105
          `}
        >
          {icon}
        </div>
      </div>

      {/* ======================================================
          الرقم
      ======================================================= */}

      <div className="relative mt-5">
        <h2
          className="
            truncate
            text-3xl
            font-bold
            leading-none
            tracking-tight
            text-slate-900
            sm:text-4xl
          "
        >
          {value}
        </h2>
      </div>

      {/* ======================================================
          الوصف
      ======================================================= */}

      <div className="relative mt-3 flex min-w-0 items-center gap-2">
        <span
          className={`
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            ${theme.dot}
          `}
        />

        <span className="truncate text-xs text-slate-400">
          {description}
        </span>
      </div>
    </div>
  );
}