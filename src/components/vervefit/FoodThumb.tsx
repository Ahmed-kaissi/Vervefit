import { cn } from "@/lib/utils";
interface Props {
  name: string;
  category: string;
  size?: string;
  className?: string;
}

/** A colour-coded category chip, mirrored by the icon in MealSection. */
function chip(categoryLabel: string) {
  switch (categoryLabel) {
    case "protein":
      return { bg: "#1A2E1A", dot: "#00C853", label: "protein" as const };
    case "carb":
      return { bg: "#2E2E14", dot: "#FFB300", label: "carb" as const };
    case "fat":
      return { bg: "#141A2E", dot: "#64B5F6", label: "fat" as const };
    default:
      return { bg: "#1A2E1A", dot: "#00C853", label: "protein" as const };
  }
}

export function FoodThumb({ name, category, size = "sm", className }: Props) {
  const chipInfo = chip(category);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl text-left shadow-card",
        size === "sm"
          ? "h-12 w-12 rounded-full"
          : "aspect-square w-20",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex size-full items-center justify-center">
        <span
          className="flex size-full items-center justify-center rounded-xl"
          style={{ backgroundColor: chipInfo.bg }}
        >
          <span
            className="flex size-2.5 items-center justify-center rounded-full"
            style={{ backgroundColor: chipInfo.dot }}
          />
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-1.5",
          size === "sm" ? "pb-2 pt-2" : "pb-3 pt-3",
        )}
      >
        <span
          className={cn(
            "truncate text-center text-[10px] font-bold leading-none",
            size === "sm" ? "text-[#E8E8E8] flex-1" : "text-[#E8E8E8]",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "mt-0.5 truncate text-center text-[9px] font-medium leading-tight",
            size === "sm" ? "text-[#9A9A9A]" : "text-[#9A9A9A]",
          )}
        >
          {chipInfo.label}
        </span>
      </div>
    </div>
  );
}
