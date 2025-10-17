import { Check } from "lucide-react";
import type { HTMLAttributes } from "react";

type BrandMarkProps = {
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
} & HTMLAttributes<HTMLDivElement>;

const ICON_SIZES: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "h-10 w-10 text-xl",
  md: "h-16 w-16 text-2xl",
  lg: "h-20 w-20 text-3xl",
};

export default function BrandMark({
  orientation = "horizontal",
  size = "md",
  showText = true,
  subtitle,
  className = "",
  ...props
}: BrandMarkProps) {
  const iconClass = ICON_SIZES[size] ?? ICON_SIZES.md;
  const isVertical = orientation === "vertical";

  return (
    <div
      className={`flex ${isVertical ? "flex-col items-center gap-4" : "items-center gap-3"} ${className}`}
      {...props}
    >
      <div
        className={`grid place-items-center rounded-3xl bg-primary text-white shadow-[0_12px_32px_rgba(76,175,80,0.25)] ${iconClass}`}
      >
        <Check size={isVertical ? 32 : 28} strokeWidth={2.5} />
      </div>
      {showText && (
        <div className={isVertical ? "text-center space-y-1" : "space-y-1"}>
          <p className="text-xl font-semibold text-gray-900">Family ToDo</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}

