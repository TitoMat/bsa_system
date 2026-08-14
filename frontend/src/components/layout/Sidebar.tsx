import dayjs from "dayjs";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link, useLocation } from "react-router-dom";
import { sidebarItems } from "./sidebar.config";
import type { SidebarItem } from "./sidebar.config";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useSidebarStore } from "../../features/sidebar/useSidebarStore";
import { hasPermission } from "../../lib/permissions";

declare const __APP_VERSION__: string;

type SidebarProps = {
  mobileOpen?: boolean;
};

export function Sidebar({ mobileOpen = false }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const userPermissions = user?.permissions ?? [];

  const [now, setNow] = useState(dayjs());
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setOpenPopup(null);
    setPopupAnchor(null);
  }, [collapsed]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenPopup(null);
        setPopupAnchor(null);
      }
    }
    if (openPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPopup]);

  const canUse = useCallback(
    (permission?: string | string[]) => {
      if (!permission) return true;
      return hasPermission(userPermissions, permission);
    },
    [userPermissions]
  );

  function isActive(items: SidebarItem[]): boolean {
    return items.some((item) => {
      if (item.path && location.pathname.startsWith(item.path)) return true;
      if (item.children) return isActive(item.children);
      return false;
    });
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const opening = !prev[label];
      if (!opening) {
        const next = { ...prev };
        delete next[label];
        return next;
      }
      return { [label]: true };
    });
  }

  function isItemActive(item: SidebarItem): boolean {
    if (item.path && location.pathname.startsWith(item.path)) return true;
    if (item.children) return isActive(item.children);
    return false;
  }

  function filterVisible(items: SidebarItem[]): SidebarItem[] {
    return items.filter((item) => {
      const visible = canUse(item.permission);
      if (item.children) {
        return visible && item.children.some((c) => canUse(c.permission));
      }
      return visible;
    });
  }

  function navLinkClass(isActive: boolean) {
    return [
      "flex items-center rounded-xl text-sm transition-all duration-150",
      collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2.5",
      isActive
        ? "bg-[rgba(255,255,255,0.14)] text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.88)]"
        : "text-white/80 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
    ].join(" ");
  }

  function groupButtonClass(isActive: boolean) {
    return [
      "flex w-full items-center rounded-xl text-sm transition-all duration-150",
      collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2.5",
      isActive
        ? "bg-[rgba(255,255,255,0.14)] text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.88)]"
        : "text-white/80 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
    ].join(" ");
  }

  function subLinkClass(isActive: boolean) {
    return [
      "flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition-all duration-150",
      isActive
        ? "bg-[rgba(255,255,255,0.14)] text-white"
        : "text-white/75 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
    ].join(" ");
  }

  const SIDEBAR_WIDTH = collapsed ? "lg:w-[72px]" : "lg:w-[240px]";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col transition-all duration-200 lg:sticky lg:top-0 lg:z-auto ${SIDEBAR_WIDTH} ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ background: "var(--sidebar-gradient)" }}
      >
        <div className="flex h-14 shrink-0 items-center justify-center px-4 lg:h-[56px]">
          <Link
            to="/dashboard"
            className="flex items-center justify-center rounded-lg transition hover:opacity-80"
            title={collapsed ? "Dashboard" : "Go to dashboard"}
            aria-label="Go to dashboard"
          >
            {collapsed ? (
              <img
                src="/favicon.svg"
                alt="BSA icon"
                className="h-9 w-9 object-contain"
              />
            ) : (
              <img
                src="/logo.png"
                alt="BSA logo"
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            )}
          </Link>
        </div>

        {!collapsed ? (
          <div className="shrink-0 px-4 pb-3">
            <p className="truncate text-center text-xs font-medium text-[var(--color-text-on-brand)]/80">
              {now.format("HH:mm:ss")}
              <span className="ml-2 text-[var(--color-text-on-brand)]/60">
                {now.format("MMM DD, YYYY")}
              </span>
            </p>
          </div>
        ) : (
          <div className="shrink-0 pb-2 text-center">
            <p className="text-[11px] font-medium text-[var(--color-text-on-brand)]/80">
              {now.format("HH:mm")}
            </p>
          </div>
        )}

        <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
          {filterVisible(sidebarItems).map((item) => {
            if (!item.children) {
              return (
                <NavLink
                  key={item.label}
                  to={item.path!}
                  end
                  className={() => navLinkClass(isItemActive(item))}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            }

            const groupActive = isItemActive(item);
            const isOpen = expandedGroups[item.label] ?? groupActive;

            if (!collapsed) {
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    className={groupButtonClass(groupActive)}
                  >
                    <item.icon size={18} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-bg-surface)]/15 pl-3 ml-3">
                      {renderChildren(item.children, false)}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    if (openPopup === item.label) {
                      setOpenPopup(null);
                      setPopupAnchor(null);
                    } else {
                      setOpenPopup(item.label);
                      const r = e.currentTarget.getBoundingClientRect();
                      setPopupAnchor({ top: r.top, left: r.right + 8 });
                    }
                  }}
                  className={groupButtonClass(groupActive)}
                  title={item.label}
                >
                  <item.icon size={18} />
                </button>

                {openPopup === item.label && popupAnchor && createPortal(
                  <div
                    ref={popupRef}
                    style={{
                      position: 'fixed',
                      top: popupAnchor.top,
                      left: popupAnchor.left,
                      zIndex: 9999,
                    }}
                    className="w-auto min-w-[200px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-1.5 shadow-lg"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      {item.label}
                    </div>
                    {renderChildren(item.children, true)}
                  </div>,
                  document.body,
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 px-3 pb-4 pt-2">
          <button
            type="button"
            onClick={() => {
              toggleCollapsed();
              setExpandedGroups({});
            }}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-on-brand)]/70 transition hover:bg-[var(--color-bg-surface)]/20 hover:text-[var(--color-text-on-brand)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>

          {!collapsed && (
            <div className="mt-2 space-y-0.5 text-center">
              <p className="text-[10px] text-[var(--color-text-on-brand)]/70">
                v{typeof __APP_VERSION__ !== "undefined"
                  ? __APP_VERSION__.replace(/^v/, '')
                  : "0.0.0"}
              </p>
              <p className="text-[9px] text-[var(--color-text-on-brand)]/50">Developed by Mat O.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  function renderChildren(children: SidebarItem[], isPopup: boolean) {
    const visible = filterVisible(children);

    return visible.map((child) => {
      if (!child.children) {
        return (
          <NavLink
            key={child.label}
            to={child.path!}
            end
            onClick={() => {
              if (isPopup) { setOpenPopup(null); setPopupAnchor(null); }
            }}
            className={({ isActive }) =>
              isPopup
                ? popupLinkClass(isActive)
                : subLinkClass(isActive && isItemActive(child))
            }
          >
            <child.icon size={16} className="shrink-0" />
            <span className="leading-5">{child.label}</span>
          </NavLink>
        );
      }

      const childGroupActive = isItemActive(child);
      const childIsOpen =
        expandedGroups[child.label] ?? childGroupActive;

      if (!isPopup) {
        return (
          <div key={child.label}>
            <button
              type="button"
              onClick={() => toggleGroup(child.label)}
              className={subLinkClass(childGroupActive)}
            >
              <child.icon size={16} className="shrink-0" />
              <span className="flex-1 text-left leading-5">
                {child.label}
              </span>
              <ChevronDown
                size={12}
                className={`shrink-0 transition-transform duration-200 ${
                  childIsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {childIsOpen && (
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-bg-surface)]/10 pl-3">
                {renderChildren(child.children, isPopup)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={child.label}>
          <button
            type="button"
            onClick={() => toggleGroup(child.label)}
            className={popupLinkClass(childGroupActive)}
          >
            <child.icon size={16} className="shrink-0" />
            <span className="flex-1 text-left leading-5">{child.label}</span>
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform duration-200 ${
                childIsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {childIsOpen && (
            <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border-subtle)] pl-2">
              {renderChildren(child.children, isPopup)}
            </div>
          )}
        </div>
      );
    });
  }

  function popupLinkClass(isActive: boolean) {
    return [
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
      isActive
        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-muted)]",
    ].join(" ");
  }

}
