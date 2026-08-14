import { useState } from 'react';
import type { CarItem, CreateCarPayload, UpdateCarPayload } from '../types/car.types';
import { getCarTypes, FLEET_ASSIGNMENT_POOLS, VEHICLE_STATUSES, CODING_DAYS } from '../types/car.types';
import { Alert } from '../../../../shared/components/Alert';
import { AppModal } from '../../../../components/ui/AppModal';
import { Toggle } from '../../../../shared/components/Toggle';

type Props = {
  open: boolean;
  submitting: boolean;
  serverError?: string;
  car?: CarItem | null;
  onClose: () => void;
  onSubmit: ((payload: CreateCarPayload, photo?: File) => Promise<void>) | ((payload: UpdateCarPayload, photo?: File) => Promise<void>);
};

type FormState = CreateCarPayload & { carType: string };

const initialState: FormState = {
  make: '',
  model: '',
  year: undefined,
  plateNumber: '',
  color: '',
  carType: 'Sedan',
  isActive: true,
  seatingCapacity: 5,
  vehicleStatus: 'OPERATIONAL',
  registrationExpiry: '',
  insuranceExpiry: '',
  codingDay: 'NONE',
  assignmentPool: 'GENERAL',
  autoAssignEnabled: true,
  allowGeneralUseWhenExecutiveAway: false,
};

export default function CreateCarModal({
  open,
  submitting,
  serverError,
  car,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!car;

  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    setErrors({});
    setPhoto(undefined);
    if (car) {
      setForm({
        make: car.make,
        model: car.model,
        year: car.year ? Number(car.year) : undefined,
        plateNumber: car.plateNumber,
        color: car.color,
        carType: car.carType,
        isActive: car.status === 'ACTIVE',
        seatingCapacity: car.seatingCapacity,
        vehicleStatus: car.vehicleStatus,
        registrationExpiry: car.registrationExpiry,
        insuranceExpiry: car.insuranceExpiry,
        codingDay: car.codingDay,
        assignmentPool: car.assignmentPool,
        autoAssignEnabled: car.autoAssignEnabled,
        allowGeneralUseWhenExecutiveAway: car.allowGeneralUseWhenExecutiveAway,
      });
      setPhotoPreview(car.photoUrl || null);
    } else {
      setForm(initialState);
      setPhotoPreview(null);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.make.trim()) errs.make = 'Make is required';
    if (!form.model.trim()) errs.model = 'Model is required';
    if (!form.plateNumber.trim()) errs.plateNumber = 'Plate number is required';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validate();
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    const payload: CreateCarPayload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year && !isNaN(Number(form.year)) ? Number(form.year) : undefined,
      plateNumber: form.plateNumber.trim(),
      color: form.color?.trim() || undefined,
      carType: form.carType,
      isActive: form.isActive,
      seatingCapacity: form.seatingCapacity,
      vehicleStatus: form.vehicleStatus,
      registrationExpiry: form.registrationExpiry || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      codingDay: form.codingDay,
      assignmentPool: form.assignmentPool,
      autoAssignEnabled: form.autoAssignEnabled,
      allowGeneralUseWhenExecutiveAway: form.allowGeneralUseWhenExecutiveAway,
    };

    await onSubmit(payload, photo);
  }

  const carTypeOptions = getCarTypes();

  const inputClass =
    'h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3 text-sm outline-none focus:border-[var(--color-info)]';
  const labelClass = 'mb-1 block text-sm font-medium text-[var(--color-text-secondary)]';
  const errorClass = 'mt-1 text-xs text-[var(--color-danger)]';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Car' : 'Create Car'}
      className="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-xl border border-[var(--color-border-default)] px-4 text-sm font-medium text-[var(--color-text-secondary)] disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="create-car-form"
            disabled={submitting}
            className="h-11 rounded-xl bg-[var(--color-info)] px-4 text-sm font-semibold text-[var(--color-text-on-brand)] disabled:opacity-60"
          >
            {submitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Car'}
          </button>
        </div>
      }
    >
      <form id="create-car-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError && <Alert variant="error" message={serverError} />}

        <div>
          <label className={labelClass}>Make *</label>
          <input
            value={form.make}
            onChange={(e) => update('make', e.target.value)}
            className={inputClass}
            placeholder="e.g. Toyota"
          />
          {errors.make && <p className={errorClass}>{errors.make}</p>}
        </div>

        <div>
          <label className={labelClass}>Model *</label>
          <input
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className={inputClass}
            placeholder="e.g. Camry"
          />
          {errors.model && <p className={errorClass}>{errors.model}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Year</label>
            <input
              type="number"
              value={form.year ?? ''}
              onChange={(e) => update('year', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
              placeholder="e.g. 2024"
            />
          </div>

          <div>
            <label className={labelClass}>Plate Number *</label>
            <input
              value={form.plateNumber}
              onChange={(e) => update('plateNumber', e.target.value)}
              className={inputClass}
              placeholder="e.g. ABC-1234"
            />
            {errors.plateNumber && <p className={errorClass}>{errors.plateNumber}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Color</label>
            <input
              value={form.color}
              onChange={(e) => update('color', e.target.value)}
              className={inputClass}
              placeholder="e.g. White"
            />
          </div>

          <div>
            <label className={labelClass}>Car Type</label>
            <select
              value={form.carType}
              onChange={(e) => update('carType', e.target.value)}
              className={inputClass}
            >
              {carTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Seating Capacity</label>
            <input
              type="number"
              min={1}
              max={9}
              value={form.seatingCapacity ?? ''}
              onChange={(e) => update('seatingCapacity', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className={labelClass}>Vehicle Status</label>
            <select
              value={form.vehicleStatus ?? 'OPERATIONAL'}
              onChange={(e) => update('vehicleStatus', e.target.value as FormState['vehicleStatus'])}
              className={inputClass}
            >
              {VEHICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Registration Expiry <span className="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
            <input
              type="date"
              value={form.registrationExpiry ?? ''}
              onChange={(e) => update('registrationExpiry', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Insurance Expiry <span className="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
            <input
              type="date"
              value={form.insuranceExpiry ?? ''}
              onChange={(e) => update('insuranceExpiry', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Coding Day</label>
            <select
              value={form.codingDay ?? 'NONE'}
              onChange={(e) => update('codingDay', e.target.value as FormState['codingDay'])}
              className={inputClass}
            >
              {CODING_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Assignment Pool</label>
            <select
              value={form.assignmentPool ?? 'GENERAL'}
              onChange={(e) => update('assignmentPool', e.target.value as FormState['assignmentPool'])}
              className={inputClass}
            >
              {FLEET_ASSIGNMENT_POOLS.map((pool) => (
                <option key={pool} value={pool}>
                  {pool}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--color-border-default)] p-4">
          <Toggle
            checked={form.autoAssignEnabled ?? true}
            onChange={(checked) => update('autoAssignEnabled', checked)}
            label="Auto-assign this vehicle to requests"
          />
          {form.assignmentPool === 'EXECUTIVE' ? (
            <Toggle
              checked={form.allowGeneralUseWhenExecutiveAway ?? false}
              onChange={(checked) => update('allowGeneralUseWhenExecutiveAway', checked)}
              label="Allow general use when executive is away"
            />
          ) : null}
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
            onChange={(e) => update('isActive', e.target.value === 'ACTIVE')}
            className={inputClass}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Photo</label>
          {photoPreview ? (
            <div className="mb-3 overflow-hidden rounded-xl border border-[var(--color-border-default)]">
              <img src={photoPreview} alt="Preview" className="h-40 w-full object-cover" />
            </div>
          ) : null}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoChange}
            className="w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-brand)]"
          />
        </div>
      </form>
    </AppModal>
  );
}
