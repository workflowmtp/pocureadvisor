'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Force dark theme on register page to match login
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#08080F';
    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.background = '';
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Tous les champs sont requis');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        setLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  }

  return (
    <div id="loginScreen" className="fixed inset-0 bg-[#08080F] flex items-center justify-center z-[10000]">
      {/* Background animé */}
      <div className="login-bg absolute inset-0 overflow-hidden"></div>

      {/* Container */}
      <div className="login-container relative z-10 w-[420px] max-w-[92vw] p-10 bg-[rgba(22,22,37,0.85)] border border-[var(--border-primary)] rounded-[20px] backdrop-blur-[20px] shadow-[var(--shadow-xl)]">
        {/* Header */}
        <div className="login-logo text-center mb-8">
          <div className="login-logo-icon w-16 h-16 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-[14px] flex items-center justify-center mx-auto mb-4 text-[28px] text-white shadow-[var(--shadow-glow-blue)]">
            🔍
          </div>
          <h1 className="login-title text-[var(--fs-2xl)] font-bold text-white tracking-[-0.5px]">ProcureAdvisor</h1>
          <p className="login-subtitle text-[var(--fs-sm)] text-[var(--text-secondary)] mt-1 tracking-[2px] uppercase">Intelligence Achats — MULTIPRINT S.A.</p>
          <p className="text-[var(--fs-xs)] text-[var(--text-tertiary)] mt-2">Créer un compte</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error show mb-4 p-3 bg-[var(--accent-red-soft)] border border-[rgba(239,68,68,0.3)] rounded-[var(--radius-md)] text-[var(--accent-red)] text-[var(--fs-sm)] text-center">
            {error}
          </div>
        )}

        {/* Register form */}
        <form onSubmit={handleSubmit} className="space-y-0">
          <div className="login-field mb-5">
            <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Nom complet</label>
            <div className="login-input-wrap relative">
              <span className="field-icon absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-base pointer-events-none">👤</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="login-input w-full py-3 px-[14px] pl-[42px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-[var(--fs-base)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                placeholder="Jean Dupont"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-field mb-5">
            <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Adresse e-mail</label>
            <div className="login-input-wrap relative">
              <span className="field-icon absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-base pointer-events-none">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input w-full py-3 px-[14px] pl-[42px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-[var(--fs-base)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="login-field mb-5">
            <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Mot de passe</label>
            <div className="login-input-wrap relative">
              <span className="field-icon absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-base pointer-events-none">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input w-full py-3 px-[14px] pl-[42px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-[var(--fs-base)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                placeholder="Minimum 8 caractères"
                required
              />
            </div>
          </div>

          <div className="login-field mb-5">
            <label className="login-label block text-[var(--fs-sm)] font-medium text-[var(--text-secondary)] mb-2">Confirmer le mot de passe</label>
            <div className="login-input-wrap relative">
              <span className="field-icon absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-base pointer-events-none">🔐</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="login-input w-full py-3 px-[14px] pl-[42px] bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-[var(--fs-base)] outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] transition-all"
                placeholder="Retapez votre mot de passe"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-btn w-full py-[13px] bg-gradient-to-br from-[var(--accent-blue)] to-[#2563EB] border-none rounded-[var(--radius-md)] text-white text-[var(--fs-base)] font-semibold cursor-pointer mt-2 tracking-[0.3px] hover:-translate-y-[1px] hover:shadow-[var(--shadow-glow-blue)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner w-5 h-5 border-2 border-white/30 border-t-white" />
                Création en cours...
              </>
            ) : 'Créer mon compte'}
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Déjà un compte ?{' '}
            <a href="/login" className="text-[var(--accent-blue)] hover:underline font-semibold">
              Se connecter
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes loginBgPulse {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(-3%,2%) scale(1.05); }
        }
        .login-bg::before {
          content: '';
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.05) 0%, transparent 50%);
          animation: loginBgPulse 15s ease-in-out infinite alternate;
        }
        .login-input::placeholder { color: var(--text-tertiary); }
      `}</style>
    </div>
  );
}
