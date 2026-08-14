import type { CarItem } from '../types/car.types';
import { StatusBadge } from '../../../../shared/components/Badge';
import { ActionIconButton } from '../../../../shared/components/ActionIconButton';
import { LoadingState } from '../../../../shared/components/LoadingState';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Pencil, Trash2 } from 'lucide-react';

type Props = {
  items: CarItem[];
  loading: boolean;
  canEdit: boolean;
  canDelete?: boolean;
  onEdit: (car: CarItem) => void;
  onDelete?: (car: CarItem) => void;
};

export default function CarTable({ items, loading, canEdit, canDelete, onEdit, onDelete }: Props) {
  if (loading) return <LoadingState message="Loading cars..." />;
  if (!items.length) return <EmptyState title="No cars found" />;

  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Make</th>
              <th>Model</th>
              <th>Year</th>
              <th>Plate Number</th>
              <th>Color</th>
              <th>Type</th>
              <th>Vehicle Status</th>
              <th>Coding Day</th>
              <th>Pool</th>
              <th>Status</th>
              <th className="text-center" style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((car) => (
              <tr key={car.id}>
                <td className="align-top">
                  <div className="flex items-center gap-3">
                    {car.photoUrl ? (
                      <img src={car.photoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-semibold"
                        style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                        {car.make.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{car.make}</span>
                  </div>
                </td>
                <td className="align-top">{car.model}</td>
                <td className="align-top">{car.year || '\u2014'}</td>
                <td className="align-top font-mono text-sm">{car.plateNumber}</td>
                <td className="align-top">{car.color || '\u2014'}</td>
                <td className="align-top">{car.carType}</td>
                <td className="align-top"><StatusBadge status={car.vehicleStatus} /></td>
                <td className="align-top"><StatusBadge status={car.codingDay} /></td>
                <td className="align-top"><StatusBadge status={car.assignmentPool} /></td>
                <td className="align-top"><StatusBadge status={car.status} /></td>
                <td className="align-top text-center">
                  <div className="flex justify-center gap-1">
                    {canEdit && (
                      <ActionIconButton title={`Edit ${car.make} ${car.model}`} onClick={() => onEdit(car)} tone="sky">
                        <Pencil size={14} />
                      </ActionIconButton>
                    )}
                    {canDelete && onDelete && (
                      <ActionIconButton title={`Delete ${car.make} ${car.model}`} onClick={() => onDelete(car)} tone="red">
                        <Trash2 size={14} />
                      </ActionIconButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
