import type { DispatchSettings, ExecutiveResourcesSummary } from '../../types/transportation.types';

type PendingAction = {
  mutate: () => void;
  isPending: boolean;
};

type StrategyAction = {
  mutate: (strategy: string) => void;
  isPending: boolean;
};

function Toggle({
  on,
  pending,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  pending: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={pending}
      className="relative h-5 w-9 rounded-full transition-colors disabled:opacity-60"
      style={{ background: on ? 'var(--color-brand)' : 'var(--color-border-default)' }}
      aria-label={ariaLabel}
      aria-pressed={on}
    >
      <div
        className="h-4 w-4 rounded-full bg-white shadow-sm"
        style={{ marginLeft: on ? 16 : 2, transition: 'margin 150ms' }}
      />
    </button>
  );
}

function ControlSegment({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export default function DispatchControlBar({
  settings,
  executiveResources,
  toggleAuto,
  toggleBoss,
  changeStrategy,
}: {
  settings: DispatchSettings | undefined;
  executiveResources: ExecutiveResourcesSummary | undefined;
  toggleAuto: PendingAction;
  toggleBoss: PendingAction;
  changeStrategy: StrategyAction;
}) {
  if (!settings) return null;

  const bossPresent = settings.executiveReservationMode;
  const execTitle = executiveResources
    ? `${executiveResources.executiveDrivers.eligible} eligible drivers · ${executiveResources.executiveVehicles.available} available vehicles`
    : undefined;

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2.5"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      <ControlSegment label="Auto Dispatch">
        <Toggle
          on={settings.autoDispatchEnabled}
          pending={toggleAuto.isPending}
          onToggle={() => toggleAuto.mutate()}
          ariaLabel={settings.autoDispatchEnabled ? 'Turn auto dispatch off' : 'Turn auto dispatch on'}
        />
        <span className="text-xs font-semibold" style={{ color: settings.autoDispatchEnabled ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          {settings.autoDispatchEnabled ? 'ON' : 'OFF'}
        </span>
      </ControlSegment>

      <ControlSegment label="Boss Status">
        <Toggle
          on={bossPresent}
          pending={toggleBoss.isPending}
          onToggle={() => toggleBoss.mutate()}
          ariaLabel={bossPresent ? 'Mark boss as away' : 'Mark boss as present'}
        />
        <span className="text-xs font-semibold" style={{ color: bossPresent ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
          {bossPresent ? 'Present' : 'Away'}
        </span>
      </ControlSegment>

      <ControlSegment label="Dispatch Strategy">
        <select
          value={settings.defaultAssignmentStrategy}
          onChange={(e) => changeStrategy.mutate(e.target.value)}
          disabled={changeStrategy.isPending}
          className="rounded-md border px-2 py-1 text-xs"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
          aria-label="Dispatch strategy"
        >
          <option value="FAIR_RANDOM">Fair Random</option>
          <option value="PURE_RANDOM">Pure Random</option>
        </select>
      </ControlSegment>

      <ControlSegment label="Executive Unit">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase"
          title={execTitle}
          style={{
            background: bossPresent ? 'var(--color-warning-soft)' : 'var(--color-brand-soft)',
            color: bossPresent ? 'var(--color-warning)' : 'var(--color-brand)',
          }}
        >
          {bossPresent ? 'Reserved' : 'Available'}
        </span>
      </ControlSegment>
    </div>
  );
}
