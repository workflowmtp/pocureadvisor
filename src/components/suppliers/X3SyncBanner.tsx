import Link from 'next/link';

export default function X3SyncBanner({ module }: { module: 'suppliers' | 'orders' }) {
  const messages = {
    suppliers: {
      title: 'Données synchronisées depuis Sage X3',
      desc: 'Les fournisseurs sont créés et gérés dans Sage X3. ProcureAdvisor enrichit les données avec scoring, anomalies, évaluations et recommandations IA.',
      extra: (
        <>
          Pour prospecter, utilisez le module{' '}
          <Link href="/sourcing/alternatives" className="text-brand-blue underline hover:no-underline">
            Fournisseurs Alternatifs
          </Link>.
        </>
      ),
    },
    orders: {
      title: 'Commandes synchronisées depuis Sage X3',
      desc: 'Les bons de commande sont créés dans Sage X3. ProcureAdvisor surveille les retards, calcule les risques de rupture, détecte les anomalies et assiste les relances fournisseurs.',
      extra: null,
    },
  };

  const msg = messages[module];

  return (
    <div className="flex items-start gap-3 p-4 bg-brand-purple-soft border border-purple-200 dark:border-purple-800/30 rounded-xl mb-5">
      <span className="text-xl flex-shrink-0 mt-0.5">💻</span>
      <div>
        <div className="text-sm font-semibold text-brand-purple">{msg.title}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
          {msg.desc}
          {msg.extra && <span className="ml-1">{msg.extra}</span>}
        </div>
      </div>
    </div>
  );
}
