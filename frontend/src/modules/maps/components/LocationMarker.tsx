import type { MapMarker } from "../types/maps.types";
import { GripVertical } from "lucide-react";

export function LocationMarker({ marker }: { marker: MapMarker }) {
  const color = marker.type === "pickup" ? "var(--color-pickup)" : "var(--color-destination)";
  const label = marker.type === "pickup" ? "A" : "B";

  return (
    <div className="group relative cursor-grab active:cursor-grabbing">
      <div
        className="flex items-center justify-center rounded-full border-2 shadow-lg"
        style={{
          width: 36,
          height: 36,
          borderColor: color,
          background: `${color}22`,
          color: color,
        }}
      >
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        {marker.address || "Drag to move"}
      </div>
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
        <GripVertical size={12} style={{ color: "var(--color-text-muted)" }} />
      </div>
    </div>
  );
}