import { ZoomIn, ZoomOut, Locate } from "lucide-react";
import { ActionIconButton } from "../../../shared/components/ActionIconButton";

type MapControlsProps = {
  onLocate: () => void;
  locationLoading: boolean;
  locationError: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function MapControls({ onLocate, locationLoading, locationError, onZoomIn, onZoomOut }: MapControlsProps) {
  return (
    <div className="bsa-map-controls flex flex-col gap-2">
      <ActionIconButton title="Zoom in" onClick={onZoomIn} tone="default">
        <ZoomIn size={16} />
      </ActionIconButton>
      <ActionIconButton title="Zoom out" onClick={onZoomOut} tone="default">
        <ZoomOut size={16} />
      </ActionIconButton>
      <ActionIconButton
        title={locationLoading ? "Locating..." : "Current location"}
        onClick={onLocate}
        tone={locationError ? "red" : "default"}
        disabled={locationLoading}
      >
        <Locate size={16} />
      </ActionIconButton>
    </div>
  );
}