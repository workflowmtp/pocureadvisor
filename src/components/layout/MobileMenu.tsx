'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  const menuItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
    { href: '/orders', label: 'Commandes', icon: '📋' },
    { href: '/suppliers', label: 'Fournisseurs', icon: '🏢' },
    { href: '/audit', label: 'Audit & Contrôle', icon: '🔍' },
    { href: '/ocr', label: 'OCR/Numérisation', icon: '📸' },
    { href: '/sourcing', label: 'Veille & Sourcing', icon: '🔎' },
    { href: '/ai', label: 'ProcureBot IA', icon: '🤖' },
    { href: '/settings', label: 'Paramètres', icon: '⚙️' },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Mobile Menu */}
      <div className="fixed top-0 left-0 w-72 h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] z-50 lg:hidden transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PA</span>
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
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--sidebar-text)] hover:text-white hover:bg-[var(--sidebar-item-hover)] transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">JD</span>
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-medium">Jean Dupont</div>
              <div className="text-[var(--sidebar-text)] text-xs">Directeur Achats</div>
            </div>
          </div>
          <button className="w-full px-3 py-2 bg-[var(--sidebar-item-hover)] text-[var(--sidebar-text)] hover:text-white rounded-lg transition-colors text-sm">
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
}
