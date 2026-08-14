import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { Input, Select, Textarea, DateInput } from '../../../shared/components/Input';
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
  getDutySchedules,
  createDutySchedule,
  updateDutySchedule,
  deleteDutySchedule,
} from '../api/scheduling.api';
import { getDrivers } from '../../catalog/drivers/services/driver.api';
import type {
  DutyScheduleItem,
  DriverDutyScheduleStatus,
  CreateDutySchedulePayload,
  UpdateDutySchedulePayload,
} from '../types/scheduling.types';
import { DRIVER_DUTY_SCHEDULE_STATUSES } from '../types/scheduling.types';
import {
  dayName,
  formatDateShort,
  formatShift,
  isOvernightShift,
  shiftDurationHours,
} from '../utils/shiftTime';

const STATUS_SCHEME: Record<DriverDutyScheduleStatus, 'emerald' | 'zinc' | 'amber' | 'rose'> = {
  ON_DUTY: 'emerald',
  REST_DAY: 'zinc',
  LEAVE: 'amber',
  UNAVAILABLE: 'rose',
};

type AlertState = { type: 'success' | 'error'; message: string } | null;

type ScheduleForm = {
  driverId: string;
  scheduleDate: string;
  shiftStart: string;
  shiftEnd: string;
  status: DriverDutyScheduleStatus;
  notes: string;
};

const EMPTY_FORM: ScheduleForm = {
  driverId: '',
  scheduleDate: '',
  shiftStart: '08:00',
  shiftEnd: '17:00',
  status: 'ON_DUTY',
  notes: '',
};

type DriverOption = { id: string; name: string };

export default function DutySchedulePage() {
  const authUser = useAuthStore((state) => state.user);
  const userPermissions = authUser?.permissions ?? [];
  const canEdit = hasPermission(userPermissions, 'driver.edit');
  const canDelete = hasPermission(userPermissions, 'driver.edit');

  const [items, setItems] = useState<DutyScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [driverId, setDriverId] = useState('');
  const [status, setStatus] = useState<DriverDutyScheduleStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [alert, setAlert] = useState<AlertState>(null);
  const [modalError, setModalError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DutyScheduleItem | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);

  const driverNameById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver.name])),
    [drivers],
  );

  useEffect(() => {
    getDrivers({ page: 1, limit: 500 })
      .then((res) => {
        const options = (res.items ?? []).map((driver) => ({
          id: driver.id,
          name: driver.name,
        }));
        setDrivers(options);
      })
      .catch(() => setDrivers([]));
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [page, limit, driverId, status, from, to]);

  async function loadSchedules() {
    try {
      setLoading(true);
      setAlert(null);
      const res = await getDutySchedules({ page, limit, driverId, status, from, to });
      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load duty schedules.',
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

  function openEdit(schedule: DutyScheduleItem) {
    if (!canEdit) return;
    setEditing(schedule);
    setForm({
      driverId: schedule.driverId,
      scheduleDate: schedule.scheduleDate,
      shiftStart: schedule.shiftStart,
      shiftEnd: schedule.shiftEnd,
      status: schedule.status,
      notes: schedule.notes ?? '',
    });
    setModalError('');
    setModalOpen(true);
  }

  function setField<K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (!canEdit) return;
    if (!form.driverId || !form.scheduleDate || !form.shiftStart || !form.shiftEnd) {
      setModalError('Driver, date, shift start and shift end are required.');
      return;
    }
    if (form.shiftStart === form.shiftEnd) {
      setModalError('Shift start and shift end cannot be the same time.');
      return;
    }
    try {
      setSubmitting(true);
      setModalError('');
      const payload: CreateDutySchedulePayload = {
        driverId: form.driverId,
        scheduleDate: form.scheduleDate,
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateDutySchedule(editing.id, payload as UpdateDutySchedulePayload);
        setAlert({ type: 'success', message: 'Duty schedule updated.' });
      } else {
        await createDutySchedule(payload);
        setAlert({ type: 'success', message: 'Duty schedule created.' });
        setPage(1);
      }
      setModalOpen(false);
      await loadSchedules();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to save duty schedule.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(schedule: DutyScheduleItem) {
    if (!canDelete) return;
    const driverName = driverNameById.get(schedule.driverId) ?? 'this driver';
    if (!window.confirm(`Delete duty schedule for ${driverName} on ${schedule.scheduleDate}?`)) return;
    try {
      await deleteDutySchedule(schedule.id);
      setAlert({ type: 'success', message: 'Duty schedule deleted.' });
      await loadSchedules();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete duty schedule.',
      });
    }
  }

  const footer = (
    <>
      <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Schedule'}
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
          <DateInput
            label="From date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <DateInput
            label="To date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Driver"
            value={driverId}
            onChange={(e) => {
              setDriverId(e.target.value);
              setPage(1);
            }}
            placeholder="All drivers"
            options={drivers.map((driver) => ({ value: driver.id, label: driver.name }))}
          />
          <Select
            label="Duty status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as DriverDutyScheduleStatus | '');
              setPage(1);
            }}
            placeholder="All statuses"
            options={DRIVER_DUTY_SCHEDULE_STATUSES.map((value) => ({ value, label: value }))}
          />
        </div>

        {canEdit ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <CalendarPlus size={16} />
            Create Duty Schedule
          </Button>
        ) : null}
      </div>

      <div className="flex-1">
        {loading ? (
          <LoadingState message="Loading duty schedules..." />
        ) : !items.length ? (
          <EmptyState title="No duty schedules found" />
        ) : (
          <div className="table-shell">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Driver</th>
                    <th>Shift Start</th>
                    <th>Shift End</th>
                    <th>Hours</th>
                    <th>Duty Status</th>
                    <th>Notes</th>
                    <th className="text-center" style={{ width: 110 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="whitespace-nowrap font-medium">{formatDateShort(schedule.scheduleDate)}</td>
                      <td className="whitespace-nowrap">{dayName(schedule.scheduleDate)}</td>
                      <td className="whitespace-nowrap">
                        {driverNameById.get(schedule.driverId) ?? schedule.driverName ?? '—'}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">{schedule.shiftStart}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {isOvernightShift(schedule.shiftStart, schedule.shiftEnd) ? (
                          <span title="Overnight shift — ends the following day">
                            {schedule.shiftEnd} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(+1d)</span>
                          </span>
                        ) : (
                          schedule.shiftEnd
                        )}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {shiftDurationHours(schedule.shiftStart, schedule.shiftEnd)}h
                      </td>
                      <td>
                        <Badge scheme={STATUS_SCHEME[schedule.status]}>{schedule.status}</Badge>
                      </td>
                      <td className="max-w-52 truncate" title={schedule.notes ?? ''}>
                        {schedule.notes || '—'}
                      </td>
                      <td className="text-center">
                        {canEdit ? (
                          <div className="flex justify-center gap-1">
                            <ActionIconButton
                              title="Edit schedule"
                              onClick={() => openEdit(schedule)}
                              tone="sky"
                            >
                              <Pencil size={14} />
                            </ActionIconButton>
                            <ActionIconButton
                              title="Delete schedule"
                              onClick={() => handleDelete(schedule)}
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
          label="duty schedules"
        />
      </div>

      <AppModal
        open={modalOpen}
        title={editing ? 'Edit Duty Schedule' : 'Create Duty Schedule'}
        footer={footer}
        onClose={() => setModalOpen(false)}
      >
        {modalError ? (
          <Alert variant="error" message={modalError} onDismiss={() => setModalError('')} />
        ) : null}
        <div className="space-y-4">
          <Select
            label="Driver"
            required
            value={form.driverId}
            onChange={(e) => setField('driverId', e.target.value)}
            placeholder="Select driver"
            options={drivers.map((driver) => ({ value: driver.id, label: driver.name }))}
          />
          <DateInput
            label="Schedule date"
            required
            value={form.scheduleDate}
            onChange={(e) => setField('scheduleDate', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Shift start (24h)"
              required
              value={form.shiftStart}
              onChange={(e) => setField('shiftStart', e.target.value)}
              placeholder="08:00"
            />
            <Input
              label="Shift end (24h)"
              required
              value={form.shiftEnd}
              onChange={(e) => setField('shiftEnd', e.target.value)}
              placeholder="17:00"
            />
          </div>
          {isOvernightShift(form.shiftStart, form.shiftEnd) ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Overnight shift: ends on the day after the schedule date.
            </p>
          ) : null}
          <Select
            label="Duty status"
            value={form.status}
            onChange={(e) => setField('status', e.target.value as DriverDutyScheduleStatus)}
            options={DRIVER_DUTY_SCHEDULE_STATUSES.map((value) => ({ value, label: value }))}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Optional notes (e.g. split shift, stand-by)"
          />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Preview: {form.scheduleDate} {formatShift(form.shiftStart, form.shiftEnd)} ·{' '}
            {shiftDurationHours(form.shiftStart, form.shiftEnd)}h
          </p>
        </div>
      </AppModal>
    </div>
  );
}