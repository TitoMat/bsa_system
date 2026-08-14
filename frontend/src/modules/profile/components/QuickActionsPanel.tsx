import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';

export function QuickActionsPanel() {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Quick Actions
      </h3>

      <div className="space-y-1">
        <QuickActionButton
          icon={KeyRound}
          label="Change Password"
          onClick={() => navigate('/profile?changePassword=true')}
        />
      </div>
    </div>
  );
}

type QuickActionButtonProps = {
  icon: typeof KeyRound;
  label: string;
  onClick: () => void;
};

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-3 px-3"
      onClick={onClick}
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <Icon size={16} className="shrink-0" />
      <span className="text-sm">{label}</span>
    </Button>
  );
}
