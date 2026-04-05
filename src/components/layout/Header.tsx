'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { NAV_SECTIONS, NAV_BOTTOM } from '@/lib/constants';
import MobileMenu from './MobileMenu';

function getPageTitle(pathname: string): string {
  const allItems = [...NAV_SECTIONS.flatMap((s) => s.items), ...NAV_BOTTOM];
  const match = allItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  if (match) return match.label;
  if (pathname.includes('/suppliers/')) return 'Fiche Fournisseur';
  if (pathname.includes('/orders/')) return 'Détail Commande';
  if (pathname.includes('/audit/') && !pathname.includes('/users') && !pathname.includes('/matrix')) return 'Détail Anomalie';
  if (pathname.includes('/negotiations/')) return 'Détail Négociation';
  if (pathname.includes('/quotes/')) return 'Comparatif de Devis';
  if (pathname.includes('/letters/')) return 'Aperçu Courrier';
  if (pathname.includes('/ocr/')) return 'Analyse Document';
  return 'ProcureAdvisor';
}

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, badges } = useAppStore();

  const user = session?.user as any;
  const title = getPageTitle(pathname);
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'PA';

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <header className="topbar">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-input)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="topbar-title">{title}</h1>

        {/* Breadcrumb */}
        <span className="topbar-breadcrumb" />

        {/* Spacer */}
        <div className="topbar-spacer" />

        {/* Actions */}
        <div className="topbar-actions">
          {/* Search */}
          <div className="topbar-search hidden md:block">
            <span className="topbar-search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
            />
          </div>

          {/* Mobile Search Button */}
          <button className="md:hidden topbar-btn">🔍</button>

          {/* Notifications */}
          <button
            onClick={() => router.push('/notifications')}
            className="topbar-btn"
            title="Notifications"
          >
            🔔
            {badges.unreadNotifs > 0 && (
              <span className="badge-dot" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => { 
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              if (newTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.documentElement.classList.add('dark');
              }
            }}
            className="topbar-btn"
            title="Changer le thème"
          >
            🌓
          </button>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2"
            >
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] text-white flex items-center justify-center text-xs font-bold font-mono shadow-[var(--shadow-glow-blue)]">
                {initials}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-modal)] border border-[var(--border-primary)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden z-50">
                <div className="p-4 border-b border-[var(--border-primary)]">
                  <div className="font-semibold text-[var(--fs-sm)] text-[var(--text-primary)]">{user?.name || 'Utilisateur'}</div>
                  <div className="text-[var(--fs-xs)] text-[var(--text-tertiary)]">{user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'ACHETEUR' ? 'Acheteur' : user?.role === 'AUDIT' ? 'Auditeur' : 'Utilisateur'}</div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                    className="w-full text-left px-3 py-2 text-[var(--fs-sm)] rounded-[var(--radius-md)] hover:bg-[var(--bg-input)] text-[var(--text-secondary)] transition-colors"
                  >
                    👤 Mon Profil
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/settings'); }}
                    className="w-full text-left px-3 py-2 text-[var(--fs-sm)] rounded-[var(--radius-md)] hover:bg-[var(--bg-input)] text-[var(--text-secondary)] transition-colors"
                  >
                    ⚙️ Paramètres
                  </button>
                </div>
                <div className="p-1 border-t border-[var(--border-primary)]">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left px-3 py-2 text-[var(--fs-sm)] rounded-[var(--radius-md)] hover:bg-[var(--accent-red-soft)] text-[var(--accent-red)] transition-colors"
                  >
                    ⏻ Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
