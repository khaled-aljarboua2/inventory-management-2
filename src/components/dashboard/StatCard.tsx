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
      glow: string;
      hover: string;
      line: string;
      dot: string;
    }
  > = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      glow: "bg-blue-200/40",
      hover: "group-hover:border-blue-200",
      line: "from-blue-500 via-indigo-500 to-blue-500",
      dot: "bg-blue-500",
    },

    green: {
      icon: "bg-emerald-50 text-emerald-600",
      glow: "bg-emerald-200/40",
      hover: "group-hover:border-emerald-200",
      line: "from-emerald-500 via-teal-500 to-emerald-500",
      dot: "bg-emerald-500",
    },

    orange: {
      icon: "bg-amber-50 text-amber-600",
      glow: "bg-amber-200/40",
      hover: "group-hover:border-amber-200",
      line: "from-amber-500 via-orange-500 to-amber-500",
      dot: "bg-amber-500",
    },

    purple: {
      icon: "bg-violet-50 text-violet-600",
      glow: "bg-violet-200/40",
      hover: "group-hover:border-violet-200",
      line: "from-violet-500 via-indigo-500 to-violet-500",
      dot: "bg-violet-500",
    },
  };

  const theme =
    themes[color] ?? themes.blue;

  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
        transition-all
        duration-500
        ease-out
        hover:-translate-y-1
        hover:shadow-xl
        hover:shadow-slate-200/60
        ${theme.hover}
      `}
    >
      {/* ======================================================
          Glow
      ======================================================= */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-40
          w-40
          rounded-full
          blur-3xl
          opacity-0
          transition-all
          duration-700
          group-hover:opacity-70
          group-hover:scale-110
          ${theme.glow}
        `}
      />

      {/* ======================================================
          Glow إضافي
      ======================================================= */}

      <div
        className={`
          pointer-events-none
          absolute
          -bottom-20
          -left-20
          h-32
          w-32
          rounded-full
          blur-3xl
          opacity-0
          transition-opacity
          duration-700
          group-hover:opacity-40
          ${theme.glow}
        `}
      />

      {/* ======================================================
          الخط العلوي
      ======================================================= */}

      <div
        className={`
          absolute
          inset-x-0
          top-0
          h-[2px]
          bg-gradient-to-r
          ${theme.line}
          opacity-0
          transition-opacity
          duration-500
          group-hover:opacity-100
        `}
      />

      {/* ======================================================
          المحتوى
      ======================================================= */}

      <div className="relative flex items-center justify-between gap-5">
        {/* البيانات */}

        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2
            className="
              mt-2
              truncate
              text-3xl
              font-bold
              tracking-tight
              text-slate-900
              transition-all
              duration-300
              group-hover:-translate-x-0.5
            "
          >
            {value}
          </h2>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`
                h-1.5
                w-1.5
                rounded-full
                ${theme.dot}
              `}
            />

            <span className="truncate text-xs text-slate-400">
              {description}
            </span>
          </div>
        </div>

        {/* الأيقونة */}

        <div
          className={`
            relative
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center
            rounded-2xl
            ${theme.icon}
            shadow-sm
            transition-all
            duration-500
            ease-out
            group-hover:scale-110
            group-hover:rotate-2
          `}
        >
          {/* توهج الأيقونة */}

          <div
            className={`
              absolute
              inset-0
              rounded-2xl
              opacity-0
              blur-xl
              transition-opacity
              duration-500
              group-hover:opacity-60
              ${theme.glow}
            `}
          />

          <span className="relative">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}