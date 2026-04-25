'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const loadFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      if (res.ok) setFolders(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFolders(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, color: newColor }),
    });
    setNewName(''); setNewDesc(''); setNewColor('#3B82F6');
    setShowCreate(false);
    loadFolders();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/folders?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    loadFolders();
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Chargement...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Dossiers</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{folders.length} dossier{folders.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '10px 20px', background: 'var(--accent-blue)', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
          }}
        >+ Nouveau dossier</button>
      </div>

      {/* Grid */}
      {folders.length === 0 ? (
        <div style={{
          padding: '80px 40px', textAlign: 'center', color: 'var(--text-secondary)',
          background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-primary)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Aucun dossier</div>
          <div style={{ fontSize: '14px' }}>Créez un dossier pour organiser vos documents.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {folders.map((folder) => (
            <div
              key={folder.id}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                borderRadius: '14px', padding: '20px', cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = folder.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Delete btn */}
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: folder.id, name: folder.name }); }}
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  width: '26px', height: '26px',
                  background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px',
                }}
              >✕</button>

              <div onClick={() => router.push(`/folders/${folder.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px',
                    background: folder.color + '20', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                  }}>📁</div>
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{folder.name}</div>
                    {folder.description && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{folder.description}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ background: folder.color + '20', color: folder.color, padding: '3px 10px', borderRadius: '12px', fontWeight: 500 }}>
                    {folder._count?.documents || 0} doc{(folder._count?.documents || 0) !== 1 ? 's' : ''}
                  </span>
                  <span>{new Date(folder.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Nouveau dossier</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>Nom *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Factures 2024"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>Description</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description courte"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Couleur</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {colors.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', background: c, border: newColor === c ? '3px solid white' : 'none', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '9px 20px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleCreate} disabled={!newName.trim()}
                style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'var(--accent-blue)', color: 'white', cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.5, fontWeight: 600 }}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '28px', width: '380px', maxWidth: '90vw' }}>
            <div style={{ fontSize: '20px', marginBottom: '12px' }}>⚠️</div>
            <p style={{ fontSize: '15px', marginBottom: '24px' }}>Supprimer le dossier &quot;{confirmDelete.name}&quot; ? Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '9px 20px', border: '1px solid var(--border-primary)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: '#EF4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
