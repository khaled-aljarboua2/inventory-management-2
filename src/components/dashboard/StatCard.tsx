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

  const theme = themes[color] ?? themes.blue;

  return (
    <div
      className={`
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
        duration-300
        ease-out
        hover:-translate-y-0.5
        hover:shadow-lg
        hover:shadow-slate-200/50
        ${theme.hover}
      `}
    >
      {/* Glow */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-12
          -top-12
          h-32
          w-32
          rounded-full
          blur-3xl
          opacity-0
          transition-all
          duration-500
          group-hover:scale-110
          group-hover:opacity-70
          ${theme.glow}
        `}
      />

      {/* Top line */}

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
          duration-300
          group-hover:opacity-100
        `}
      />

      {/* Content */}

      <div className="relative flex items-start justify-between gap-4">
        {/* Information */}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">
            {title}
          </p>

          <h2
            className="
              mt-2
              truncate
              text-2xl
              font-bold
              tracking-tight
              text-slate-900
              sm:text-3xl
            "
          >
            {value}
          </h2>

          <div className="mt-2.5 flex min-w-0 items-center gap-2">
            <span
              className={`
                h-1.5
                w-1.5
                shrink-0
                rounded-full
                ${theme.dot}
              `}
            />

            <span className="truncate text-[11px] text-slate-400 sm:text-xs">
              {description}
            </span>
          </div>
        </div>

        {/* Icon */}

        <div
          className={`
            relative
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${theme.icon}
            transition-transform
            duration-300
            group-hover:scale-105
          `}
        >
          <div
            className={`
              absolute
              inset-0
              rounded-xl
              opacity-0
              blur-lg
              transition-opacity
              duration-300
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