import { Car, Pencil } from 'lucide-react';
import type { CarItem } from '../types/car.types';
import { StatusBadge } from '../../../../shared/components/Badge';

type Props = {
  car: CarItem;
  onEdit?: () => void;
};

export function CarCard({ car, onEdit }: Props) {
  return (
    <div
      className="group relative overflow-hidden rounded-[12px] border transition-shadow hover:shadow-md"
      style={{
        borderColor: 'var(--color-border-default)',
        background: 'var(--color-bg-surface)',
        boxShadow: '0 1px 3px var(--color-shadow)',
      }}
    >
      <div
        className="flex h-40 items-center justify-center overflow-hidden"
        style={{ background: 'var(--color-bg-subtle)' }}
      >
        {car.photoUrl ? (
          <img
            src={car.photoUrl}
            alt={`${car.make} ${car.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Car size={48} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border bg-white/90 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ borderColor: 'var(--color-border-default)' }}
          title="Edit car"
        >
          <Pencil size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      )}

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {car.make} {car.model}
            </h3>
            <p
              className="mt-0.5 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {car.year && `${car.year} \u00B7 `}{car.plateNumber}
            </p>
          </div>
          <StatusBadge status={car.status} />
        </div>

        <div
          className="flex flex-wrap gap-2 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {car.color && (
            <span
              className="rounded-full border px-2 py-0.5"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              {car.color}
            </span>
          )}
          <span
            className="rounded-full border px-2 py-0.5"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            {car.carType}
          </span>
          {car.vehicleStatus !== 'OPERATIONAL' && (
            <StatusBadge status={car.vehicleStatus} />
          )}
          <StatusBadge status={car.assignmentPool} />
          {car.codingDay !== 'NONE' && (
            <StatusBadge status={car.codingDay} />
          )}
        </div>
      </div>
    </div>
  );
}
