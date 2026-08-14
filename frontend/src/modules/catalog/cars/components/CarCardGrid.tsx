import { CarCard } from './CarCard';
import type { CarItem } from '../types/car.types';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { LoadingState } from '../../../../shared/components/LoadingState';

type Props = {
  items: CarItem[];
  loading?: boolean;
  onEdit?: (car: CarItem) => void;
  canEdit?: boolean;
};

export function CarCardGrid({ items, loading, onEdit, canEdit }: Props) {
  if (loading) return <LoadingState message="Loading cars..." />;
  if (!items.length) return <EmptyState title="No cars found" />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          onEdit={canEdit ? () => onEdit?.(car) : undefined}
        />
      ))}
    </div>
  );
}
