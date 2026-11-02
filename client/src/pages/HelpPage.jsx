import React from 'react';
import { HelpCircle, Command, BookOpen, Shield, MessageSquare, Terminal } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Support Documentation</h1>
          <p className="page-subtitle">Guides, keyboard shortcuts, and enterprise tenancy architecture documentation.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Keyboard Shortcuts Card */}
        <div className="table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontWeight: 600, fontSize: '0.94rem' }}>
            <Command size={18} color="var(--accent-primary)" />
            <span>Keyboard Shortcuts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span>Undo Card Action / Move</span>
              <kbd style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}>Ctrl + Z</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span>Redo Card Action</span>
              <kbd style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}>Ctrl + Y / Ctrl+Shift+Z</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span>Quick Focus Global Search</span>
              <kbd style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}>Ctrl + K</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Close Drawers & Modals</span>
              <kbd style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono)' }}>Esc</kbd>
            </div>
          </div>
        </div>

        {/* Tenancy & Concurrency FAQ */}
        <div className="table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontWeight: 600, fontSize: '0.94rem' }}>
            <BookOpen size={18} color="#059669" />
            <span>Architecture & Concurrency FAQ</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>How is tenant isolation guaranteed?</div>
              <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                All queries enforce <code>tenant_id</code> scoping combined with middleware checking verified memberships. Cross-tenant access attempts immediately fail with HTTP 403.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>What happens during concurrent task edits?</div>
              <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                Optimistic Concurrency Control checks the task's version counter. If another user saves first, the server returns HTTP 409 Conflict and launches the side-by-side diff resolution dialog.
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>How does drag & drop avoid locking rows?</div>
              <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                Fractional midpoint indexing assigns floating positions without rewriting adjacent task ranks, eliminating table lockups.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
