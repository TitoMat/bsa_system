import type { ReactNode } from 'react';

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={['flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className].filter(Boolean).join(' ')}>
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

type FilterActionsProps = {
  children: ReactNode;
};

export function FilterActions({ children }: FilterActionsProps) {
  return <div className="flex shrink-0 items-center gap-2">{children}</div>;
}
