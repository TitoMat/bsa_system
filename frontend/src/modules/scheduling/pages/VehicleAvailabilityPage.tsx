import { useEffect, useMemo, useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { Input, Select, Textarea } from '../../../shared/components/Input';
import { Pagination } from '../../../shared/components/Pagination';
import { Alert } from '../../../shared/components/Alert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/Badge';
import { ActionIconButton } from '../../../shared/components/ActionIconButton';
import { AppModal } from '../../../components/ui/AppModal';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../../lib/pagination';
import { useAuthStore } from '../../../features/auth/useAuthStore';
import { hasPermission } from '../../../lib/permissions';
import {
  getAvailabilityBlocks,
  createAvailabilityBlock,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
} from '../api/scheduling.api';
import { getCars } from '../../catalog/cars/services/car.api';
import type {
  AvailabilityBlockItem,
  VehicleBlockReason,
  CreateAvailabilityBlockPayload,
  UpdateAvailabilityBlockPayload,
} from '../types/scheduling.types';
import { VEHICLE_BLOCK_REASONS } from '../types/scheduling.types';
import { formatDateTime } from '../utils/shiftTime';

const REASON_SCHEME: Record<VehicleBlockReason, 'amber' | 'rose' | 'sky' | 'indigo' | 'zinc' | 'orange'> = {
  MAINTENANCE: 'amber',
  REPAIR: 'rose',
  LENT_OUT: 'sky',
  EXECUTIVE_RESERVED: 'indigo',
  MANUAL_BLOCK: 'zinc',
  OTHER: 'orange',
};

type AlertState = { type: 'success' | 'error'; message: string } | null;

type BlockForm = {
  vehicleId: string;
  startAt: string;
  endAt: string;
  reason: VehicleBlockReason;
  notes: string;
};

const EMPTY_FORM: BlockForm = {
  vehicleId: '',
  startAt: '',
  endAt: '',
  reason: 'MAINTENANCE',
  notes: '',
};

type CarOption = { id: string; label: string };

export default function VehicleAvailabilityPage() {
  const authUser = useAuthStore((state) => state.user);
  const userPermissions = authUser?.permissions ?? [];
  const canEdit = hasPermission(userPermissions, 'car.edit');

  const [items, setItems] = useState<AvailabilityBlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleId, setVehicleId] = useState('');
  const [reason, setReason] = useState<VehicleBlockReason | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [cars, setCars] = useState<CarOption[]>([]);
  const [alert, setAlert] = useState<AlertState>(null);
  const [modalError, setModalError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AvailabilityBlockItem | null>(null);
  const [form, setForm] = useState<BlockForm>(EMPTY_FORM);

  const carLabelById = useMemo(
    () => new Map(cars.map((car) => [car.id, car.label])),
    [cars],
  );

  useEffect(() => {
    getCars({ page: 1, limit: 500 })
      .then((res) => {
        const options = (res.items ?? []).map((car) => ({
          id: car.id,
          label: `${car.make} ${car.model}`.trim() || car.plateNumber || car.id,
        }));
        setCars(options);
      })
      .catch(() => setCars([]));
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [page, limit, vehicleId, reason, from, to]);

  async function loadBlocks() {
    try {
      setLoading(true);
      setAlert(null);
      const res = await getAvailabilityBlocks({ page, limit, vehicleId, reason, from, to });
      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load availability blocks.',
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    if (!canEdit) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(block: AvailabilityBlockItem) {
    if (!canEdit) return;
    setEditing(block);
    setForm({
      vehicleId: block.vehicleId,
      startAt: toLocalInput(block.startAt),
      endAt: toLocalInput(block.endAt),
      reason: block.reason,
      notes: block.notes ?? '',
    });
    setModalError('');
    setModalOpen(true);
  }

  function toLocalInput(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function setField<K extends keyof BlockForm>(key: K, value: BlockForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (!canEdit) return;
    if (!form.vehicleId || !form.startAt || !form.endAt) {
      setModalError('Vehicle, start and end are required.');
      return;
    }
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    if (end.getTime() <= start.getTime()) {
      setModalError('End must be later than start.');
      return;
    }
    try {
      setSubmitting(true);
      setModalError('');
      const payload: CreateAvailabilityBlockPayload = {
        vehicleId: form.vehicleId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reason: form.reason,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateAvailabilityBlock(editing.id, payload as UpdateAvailabilityBlockPayload);
        setAlert({ type: 'success', message: 'Availability block updated.' });
      } else {
        await createAvailabilityBlock(payload);
        setAlert({ type: 'success', message: 'Availability block created.' });
        setPage(1);
      }
      setModalOpen(false);
      await loadBlocks();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to save availability block.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(block: AvailabilityBlockItem) {
    if (!canEdit) return;
    const label = carLabelById.get(block.vehicleId) ?? 'this vehicle';
    if (!window.confirm(`Delete availability block for ${label}?`)) return;
    try {
      await deleteAvailabilityBlock(block.id);
      setAlert({ type: 'success', message: 'Availability block deleted.' });
      await loadBlocks();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete availability block.',
      });
    }
  }

  const footer = (
    <>
      <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Block'}
      </Button>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-5">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              setPage(1);
            }}
            placeholder="All vehicles"
            options={cars.map((car) => ({ value: car.id, label: car.label }))}
          />
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as VehicleBlockReason | '');
              setPage(1);
            }}
            placeholder="All reasons"
            options={VEHICLE_BLOCK_REASONS.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
          />
          <Input
            label="Starts on or after"
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Starts before"
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {canEdit ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <Clock3 size={16} />
            Create Block
          </Button>
        ) : null}
      </div>

      <div className="flex-1">
        {loading ? (
          <LoadingState message="Loading availability blocks..." />
        ) : !items.length ? (
          <EmptyState title="No availability blocks found" />
        ) : (
          <div className="table-shell">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Block Start</th>
                    <th>Block End</th>
                    <th>Reason</th>
                    <th>Notes</th>
                    <th className="text-center" style={{ width: 110 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((block) => (
                    <tr key={block.id}>
                      <td className="whitespace-nowrap font-medium">
                        {carLabelById.get(block.vehicleId) ?? block.vehicleLabel ?? '—'}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">{formatDateTime(block.startAt)}</td>
                      <td className="whitespace-nowrap tabular-nums">{formatDateTime(block.endAt)}</td>
                      <td>
                        <Badge scheme={REASON_SCHEME[block.reason]}>
                          {block.reason.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="max-w-52 truncate" title={block.notes ?? ''}>
                        {block.notes || '—'}
                      </td>
                      <td className="text-center">
                        {canEdit ? (
                          <div className="flex justify-center gap-1">
                            <ActionIconButton
                              title="Edit block"
                              onClick={() => openEdit(block)}
                              tone="sky"
                            >
                              <Pencil size={14} />
                            </ActionIconButton>
                            <ActionIconButton
                              title="Delete block"
                              onClick={() => handleDelete(block)}
                              tone="red"
                            >
                              <Trash2 size={14} />
                            </ActionIconButton>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--color-border-default)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          label="availability blocks"
        />
      </div>

      <AppModal
        open={modalOpen}
        title={editing ? 'Edit Availability Block' : 'Create Availability Block'}
        footer={footer}
        onClose={() => setModalOpen(false)}
      >
        {modalError ? (
          <Alert variant="error" message={modalError} onDismiss={() => setModalError('')} />
        ) : null}
        <div className="space-y-4">
          <Select
            label="Vehicle"
            required
            value={form.vehicleId}
            onChange={(e) => setField('vehicleId', e.target.value)}
            placeholder="Select vehicle"
            options={cars.map((car) => ({ value: car.id, label: car.label }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Block start"
              required
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setField('startAt', e.target.value)}
            />
            <Input
              label="Block end"
              required
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setField('endAt', e.target.value)}
            />
          </div>
          <Select
            label="Reason"
            required
            value={form.reason}
            onChange={(e) => setField('reason', e.target.value as VehicleBlockReason)}
            options={VEHICLE_BLOCK_REASONS.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Optional notes (e.g. vendor schedule, expected return)"
          />
        </div>
      </AppModal>
    </div>
  );
}