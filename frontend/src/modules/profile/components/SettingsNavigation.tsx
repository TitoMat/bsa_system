import { Bell, LayoutGrid, Lock, Palette, Shield, User } from 'lucide-react';

type SettingsSection =
  | 'profile'
  | 'account'
  | 'security'
  | 'notifications'
  | 'appearance'
  | 'layout';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'layout', label: 'Sidebar', icon: LayoutGrid },
];

type SettingsNavigationProps = {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
};

export function SettingsNavigation({ active, onChange }: SettingsNavigationProps) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className="flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-all duration-150"
          style={{
            background: active === id ? 'var(--color-brand-soft)' : 'transparent',
            color: active === id ? 'var(--color-brand-active)' : 'var(--color-text-secondary)',
            borderLeft: active === id ? '3px solid var(--color-brand)' : '3px solid transparent',
          }}
        >
          <Icon size={18} className="shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export type { SettingsSection };
