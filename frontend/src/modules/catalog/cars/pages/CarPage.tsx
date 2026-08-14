import { useEffect, useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import CreateCarModal from '../components/CreateCarModal';
import { CarCardGrid } from '../components/CarCardGrid';
import CarTable from '../components/CarTable';
import { Pagination } from '../../../../shared/components/Pagination';
import { Alert } from '../../../../shared/components/Alert';
import { Button } from '../../../../shared/components/Button';
import { Input, Select } from '../../../../shared/components/Input';
import { createCar, getCars, updateCar, deleteCar } from '../services/car.api';
import type { CarItem, CreateCarPayload, UpdateCarPayload } from '../types/car.types';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../../../lib/pagination';
import { useAuthStore } from '../../../../features/auth/useAuthStore';
import { hasPermission } from '../../../../lib/permissions';

type AlertState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null;

export default function CarPage() {
  const authUser = useAuthStore((state) => state.user);

  const [items, setItems] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [alert, setAlert] = useState<AlertState>(null);
  const [modalError, setModalError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [selectedCar, setSelectedCar] = useState<CarItem | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const userPermissions = authUser?.permissions ?? [];
  const canCreate = hasPermission(userPermissions, 'car.create');
  const canEdit = hasPermission(userPermissions, 'car.edit');
  const canDelete = hasPermission(userPermissions, 'car.delete');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void loadCars();
  }, [page, limit, search, status]);

  async function loadCars() {
    try {
      setLoading(true);
      setAlert(null);
      const res = await getCars({ page, limit, search, status });
      setItems(res.items ?? []);
      setPage(res.page ?? 1);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load cars.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(car: CarItem) {
    if (!canDelete) return;
    if (!window.confirm(`Delete ${car.make} ${car.model} (${car.plateNumber})?`)) return;
    try {
      await deleteCar(car.id);
      setAlert({ type: 'success', message: `Car "${car.make} ${car.model}" deleted.` });
      await loadCars();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete car.',
      });
    }
  }

  function openCreate() {
    if (!canCreate) return;
    setModalError('');
    setCreateOpen(true);
  }

  function openEdit(car: CarItem) {
    if (!canEdit) return;
    setSelectedCar(car);
    setModalError('');
    setEditOpen(true);
  }

  async function handleCreate(payload: CreateCarPayload, photo?: File) {
    if (!canCreate) return;
    try {
      setSubmitting(true);
      setModalError('');
      await createCar(payload, photo);
      setCreateOpen(false);
      setAlert({ type: 'success', message: 'Car created successfully.' });
      setPage(1);
      await loadCars();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to create car.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: UpdateCarPayload, photo?: File) {
    if (!selectedCar || !canEdit) return;
    try {
      setSubmitting(true);
      setModalError('');
      await updateCar(selectedCar.id, payload, photo);
      setEditOpen(false);
      setSelectedCar(null);
      setAlert({ type: 'success', message: 'Car updated successfully.' });
      await loadCars();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to update car.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeBtnClass =
    'flex h-9 w-9 items-center justify-center rounded-lg border transition';
  const inactiveBtnClass =
    'flex h-9 w-9 items-center justify-center rounded-lg border transition opacity-50 hover:opacity-80';

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col space-y-5">
      {alert ? (
        <Alert variant={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by make, model or plate number"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | 'ACTIVE' | 'INACTIVE');
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center overflow-hidden rounded-lg border"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table view"
              className={viewMode === 'table' ? activeBtnClass : inactiveBtnClass}
              style={{
                borderColor: 'transparent',
                background: viewMode === 'table' ? 'var(--color-brand-soft)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-brand)' : 'var(--color-text-muted)',
              }}
            >
              <List size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={viewMode === 'grid' ? activeBtnClass : inactiveBtnClass}
              style={{
                borderColor: 'transparent',
                background: viewMode === 'grid' ? 'var(--color-brand-soft)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--color-brand)' : 'var(--color-text-muted)',
              }}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {canCreate ? (
            <Button type="button" variant="primary" onClick={openCreate}>
              <Plus size={16} />
              Add Car
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1">
        {viewMode === 'grid' ? (
          <CarCardGrid items={items} loading={loading} onEdit={openEdit} canEdit={canEdit} />
        ) : (
          <CarTable items={items} loading={loading} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={handleDelete} />
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
          label="cars"
        />
      </div>

      <CreateCarModal
        open={createOpen}
        submitting={submitting}
        serverError={modalError}
        onClose={() => {
          setCreateOpen(false);
          setModalError('');
        }}
        onSubmit={handleCreate}
      />

      <CreateCarModal
        open={editOpen}
        car={selectedCar}
        submitting={submitting}
        serverError={modalError}
        onClose={() => {
          setEditOpen(false);
          setSelectedCar(null);
          setModalError('');
        }}
        onSubmit={handleEdit}
      />
    </div>
  );
}
