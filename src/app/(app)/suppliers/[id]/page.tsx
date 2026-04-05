'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SupplierDetail from '@/components/suppliers/SupplierDetail';

export default function SupplierDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/suppliers/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">❓</div>
        <p className="text-[var(--text-secondary)]">Fournisseur non trouvé</p>
      </div>
    );
  }

  return <SupplierDetail data={data} />;
}
