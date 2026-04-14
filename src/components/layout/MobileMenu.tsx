'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { NAV_SECTIONS, NAV_BOTTOM } from '@/lib/constants';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PA';
  const allItems = [...NAV_SECTIONS.flatMap((s) => s.items), ...NAV_BOTTOM];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 w-72 h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] z-50 lg:hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--sidebar-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-lg flex items-center justify-center text-white font-bold text-sm">
              🔍
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">ProcureAdvisor</h1>
              <p className="text-[var(--sidebar-text)] text-xs">MULTIPRINT S.A.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sidebar-text)] hover:text-white p-2 rounded-lg hover:bg-[var(--sidebar-item-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {allItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--sidebar-text-active)]'
                    : 'text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-item-hover)]'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-4 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[var(--accent-blue-soft)] border border-[rgba(59,130,246,0.3)] rounded-lg flex items-center justify-center text-[var(--accent-blue)] text-xs font-bold font-mono shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name || 'Utilisateur'}</div>
              <div className="text-[var(--sidebar-text)] text-xs truncate">{(user as any)?.roleName || 'Utilisateur'}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full px-3 py-2 bg-[var(--sidebar-item-hover)] text-[var(--sidebar-text)] hover:text-white rounded-lg transition-colors text-sm"
          >
            ⏻ Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
