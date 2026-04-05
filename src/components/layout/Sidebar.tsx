'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAppStore } from '@/stores/appStore';
import { NAV_SECTIONS, NAV_BOTTOM, type NavItem } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_CODES } from '@/lib/permissions';

// Permission mapping for nav items
const NAV_PERMISSIONS: Record<string, string> = {
  dashboard: PERMISSION_CODES.DASHBOARD_VIEW,
  suppliers: PERMISSION_CODES.SUPPLIERS_VIEW,
  orders: PERMISSION_CODES.ORDERS_VIEW,
  invoices: PERMISSION_CODES.INVOICES_VIEW,
  documents: PERMISSION_CODES.DOCUMENTS_VIEW,
  audit: PERMISSION_CODES.AUDIT_VIEW,
  anomalies: PERMISSION_CODES.AUDIT_VIEW,
  negotiations: PERMISSION_CODES.NEGOTIATIONS_VIEW,
  sourcing: PERMISSION_CODES.SOURCING_VIEW,
  sourcing_alt: PERMISSION_CODES.SOURCING_VIEW,
  ai: PERMISSION_CODES.AI_CHAT,
  letters: PERMISSION_CODES.LETTERS_VIEW,
  logs: PERMISSION_CODES.LOGS_VIEW,
  settings: PERMISSION_CODES.ADMIN_SETTINGS,
  profile: PERMISSION_CODES.DASHBOARD_VIEW, // Everyone can view their profile
};

function NavItemComponent({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const { can, hasPermission } = usePermissions();
  const badges = useAppStore((s) => s.badges);

  // Get permission for this nav item
  const navId = item.id.replace('-', '_');
  const permissionCode = NAV_PERMISSIONS[navId] || NAV_PERMISSIONS[item.id];
  
  // Check if user has permission
  if (permissionCode && !hasPermission(permissionCode as any)) {
    return null;
  }

  // Check role restriction (legacy support)
  if (item.roles) {
    const session = useSession();
    const roleCode = (session.data?.user as any)?.roleCode;
    if (roleCode && !item.roles.includes(roleCode)) return null;
  }

  const badgeCount = item.badgeKey ? (badges as any)[item.badgeKey] || 0 : 0;

  return (
    <Link
      href={item.href}
      className={`nav-item flex items-center gap-3 px-3 py-[9px] rounded-[var(--radius-md)] text-[var(--fs-sm)] font-medium transition-all relative whitespace-nowrap mb-[2px] ${
        isActive
          ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-text-active)]'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--accent-blue)] rounded-r-[3px]" />}
      <span className={`nav-item-icon w-5 min-w-5 text-center text-[15px] ${collapsed ? 'mx-auto' : ''}`}>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="nav-item-label truncate flex-1">{item.label}</span>
          {badgeCount > 0 && (
            <span className={`nav-item-badge ml-auto px-[7px] py-[1px] bg-[var(--accent-red)] text-white text-[10px] font-bold rounded-full min-w-5 text-center ${collapsed ? 'absolute top-1 right-1 px-[5px] min-w-4 text-[9px]' : ''}`}>
              {badgeCount}
            </span>
          )}
        </>
      )}
      {collapsed && badgeCount > 0 && (
        <span className="nav-item-badge absolute top-1 right-1 px-[5px] py-[1px] bg-[var(--accent-red)] text-white text-[9px] font-bold rounded-full min-w-4 text-center">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

// Import useSession for role check
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { session, roleName } = usePermissions();
  const user = session;
  const collapsed = false;

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA';
  const displayRole = roleName || 'Utilisateur';

  return (
    <aside className={`sidebar hidden lg:flex flex-col h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-all z-[100] overflow-hidden ${collapsed ? 'w-[var(--sidebar-collapsed-width)] min-w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)] min-w-[var(--sidebar-width)]'}`}>
      {/* Header */}
      <div className="sidebar-header p-5 border-b border-[var(--sidebar-border)] flex items-center gap-3 min-h-[68px]">
        <div className="sidebar-logo w-9 h-9 min-w-9 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-[var(--radius-sm)] flex items-center justify-center text-white font-bold text-base shadow-[var(--shadow-glow-blue)]">
          🔍
        </div>
        {!collapsed && (
          <div className="sidebar-brand overflow-hidden whitespace-nowrap">
            <div className="sidebar-brand-name text-[var(--fs-md)] font-bold text-white tracking-[-0.3px]">ProcureAdvisor</div>
            <div className="sidebar-brand-sub text-[var(--fs-xs)] text-[var(--sidebar-text)] tracking-[1px] uppercase">MULTIPRINT S.A.</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav flex-1 overflow-y-auto p-2">
        {NAV_SECTIONS.map((section) => {
          // Check if section has any visible items
          const session = useSession();
          const { hasPermission } = usePermissions();
          
          const hasVisibleItems = section.items.some((item) => {
            const navId = item.id.replace('-', '_');
            const permissionCode = NAV_PERMISSIONS[navId] || NAV_PERMISSIONS[item.id];
            if (permissionCode && !hasPermission(permissionCode as any)) return false;
            if (item.roles) {
              const roleCode = (session.data?.user as any)?.roleCode;
              if (roleCode && !item.roles.includes(roleCode)) return false;
            }
            return true;
          });

          if (!hasVisibleItems) return null;

          return (
            <div key={section.section} className="nav-section mb-2">
              {!collapsed && (
                <h3 className="nav-section-title px-3 py-2 text-[var(--fs-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-[1.5px] whitespace-nowrap overflow-hidden">
                  {section.section}
                </h3>
              )}
              <div className="space-y-0">
                {section.items.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-[var(--sidebar-border)] p-2">
        {NAV_BOTTOM.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer p-4 border-t border-[var(--sidebar-border)] flex items-center gap-3 cursor-pointer hover:bg-[var(--sidebar-item-hover)] transition-colors">
        <div className="sidebar-user-avatar w-[34px] h-[34px] min-w-[34px] bg-[var(--accent-blue-soft)] border border-[rgba(59,130,246,0.3)] rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--accent-blue)] text-[var(--fs-xs)] font-bold font-mono">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="sidebar-user-info overflow-hidden flex-1">
              <div className="sidebar-user-name text-[var(--fs-sm)] font-semibold text-[var(--text-primary)] whitespace-nowrap overflow-hidden text-ellipsis">
                {user?.name || 'Utilisateur'}
              </div>
              <div className="sidebar-user-role text-[var(--fs-xs)] text-[var(--sidebar-text)] whitespace-nowrap overflow-hidden text-ellipsis">
                {displayRole}
              </div>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="sidebar-logout ml-auto p-[6px] text-[var(--text-tertiary)] cursor-pointer rounded-[var(--radius-sm)] transition-colors hover:text-[var(--accent-red)] hover:bg-[var(--accent-red-soft)]"
            >
              🚪
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
