import {
  ChevronDown,
  LogOut,
  Menu,
  UserRound,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../api/auth';
import { notifySessionExpiring } from '../../lib/sessionExpiration';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { touchSession } from '../../lib/session';
import { getPageTitle } from '../../shared/constants/pageTitles';

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type TopbarProps = {
  onOpenSidebar?: () => void;
};

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const user = useAuthStore((state) => state.user);
  const logoutLocal = useAuthStore((state) => state.logoutLocal);

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname],
  );

  useState(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      touchSession();
      await notifySessionExpiring({ reason: 'logout' });
      await logoutRequest();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      logoutLocal();
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  }

  function handleMyProfile() {
    touchSession();
    setMenuOpen(false);
    navigate('/profile');
  }

  function handleToggleMenu() {
    touchSession();
    setMenuOpen((prev) => !prev);
  }

  return (
    <header
      className="sticky top-0 z-30 pt-[env(safe-area-inset-top)]"
      style={{
        background: 'var(--color-bg-canvas-alt)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 sm:px-4 lg:min-h-[56px] lg:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-surface-muted)] hover:text-[var(--color-brand)] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <h1 className="truncate text-base font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-lg">
            {pageTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={handleToggleMenu}
              className="inline-flex h-9 items-center gap-1 rounded-md pl-1 pr-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-surface-muted)] hover:text-[var(--color-brand)]"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
            >
              {user && 'avatarUrl' in user && user.avatarUrl ? (
                <img
                  src={String(user.avatarUrl)}
                  alt={`${user.name ?? 'User'} avatar`}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    background: 'var(--color-brand-soft)',
                    color: 'var(--color-brand)',
                  }}
                >
                  {getInitials(user?.name)}
                </div>
              )}

              <ChevronDown
                size={16}
                className={`transition ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border shadow-lg"
                style={{
                  background: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border-subtle)',
                }}
                role="menu"
              >
                <div
                  className="border-b px-4 py-3"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    {user && 'avatarUrl' in user && user.avatarUrl ? (
                      <img
                        src={String(user.avatarUrl)}
                        alt={`${user.name ?? 'User'} avatar`}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          background: 'var(--color-brand-soft)',
                          color: 'var(--color-brand)',
                        }}
                      >
                        {getInitials(user?.name)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {user?.name ?? 'User'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                        {user?.role ?? ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleMyProfile}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-surface-muted)] hover:text-[var(--color-brand)]"
                    role="menuitem"
                  >
                    <UserRound size={16} />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-surface-muted)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
