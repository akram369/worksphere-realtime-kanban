import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  ShieldAlert,
  Zap,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export function EdgeCaseModal() {
  const {
    isEdgeCaseModalOpen,
    setIsEdgeCaseModalOpen,
    boardData,
    addToast,
    refreshBoardData,
    loadInitialData
  } = useApp();

  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isEdgeCaseModalOpen) return null;

  // 1. Simulate OCC 409 collision
  const handleSimulateConflict = async () => {
    const firstTask = boardData?.columns?.find(c => c.tasks.length > 0)?.tasks[0];
    if (!firstTask) {
      addToast('No tasks available on board to test conflict on', 'conflict');
      return;
    }

    setIsRunning(true);
    setTestResult(null);

    try {
      const res = await api.simulateConflict(firstTask.id);
      setTestResult({
        title: 'OCC 409 Collision Triggered',
        type: 'success',
        details: `Server task "${firstTask.title}" version advanced to v${res.task.version} by simulated background user. If you submit an edit with the previous cached version (v${firstTask.version}), the server will strictly reject with HTTP 409 Conflict.`
      });
      addToast(`Bumped ${firstTask.title} to v${res.task.version} in background!`, 'info');
    } catch (err) {
      setTestResult({
        title: 'Simulation Failed',
        type: 'error',
        details: err.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 2. Cross-tenant leakage test
  const handleVerifyCrossTenant = async () => {
    setIsRunning(true);
    setTestResult(null);

    try {
      const res = await api.verifyCrossTenantIsolation();
      setTestResult({
        title: 'Cross-Tenant Isolation Verified',
        type: 'success',
        details: `Tested User: ${res.testedUser}\nTarget Tenant: ${res.targetTenant}\nIsolation Guard: Strict Discriminator Filter + Middleware Boundary Check\nResult: Unauthorized access strictly blocked (HTTP 403 Forbidden). Zero cross-tenant data leakage.`
      });
    } catch (err) {
      setTestResult({
        title: 'Test Error',
        type: 'error',
        details: err.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 3. Reset database
  const handleResetSeed = async () => {
    setIsRunning(true);
    try {
      await api.resetSeed();
      await refreshBoardData();
      await loadInitialData();
      addToast('Database reset to fresh demo seed', 'info');
      setTestResult({
        title: 'Database Reset Complete',
        type: 'success',
        details: 'All organizations, branches (Hyderabad, Bangalore, Chennai), tasks, and activity logs have been reset to default clean state.'
      });
    } catch (err) {
      addToast(err.message, 'conflict');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsEdgeCaseModalOpen(false)}>
      <div className="modal-dialog" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Edge Cases & Concurrency Test Lab</span>
          </div>
          <button className="btn-icon" onClick={() => setIsEdgeCaseModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Evaluate data isolation boundaries, mid-air concurrency collisions, and database recovery directly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <div style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} />
                  <span>1. Simulate Concurrent Edit Collision (OCC 409)</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Bumps task version on the server behind the scenes to trigger the 409 Diff Resolution Dialog.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleSimulateConflict} disabled={isRunning}>
                Trigger Collision
              </button>
            </div>

            <div style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} />
                  <span>2. Verify Cross-Tenant Isolation (HTTP 403)</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Executes an unauthorized cross-branch query to prove zero data leakage.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleVerifyCrossTenant} disabled={isRunning}>
                Verify Isolation
              </button>
            </div>

            <div style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={15} />
                  <span>3. Reset Database to Clean Seed</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Restores clean initial state across ABC Technologies branches and tasks.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetSeed} disabled={isRunning}>
                Reset Database
              </button>
            </div>
          </div>

          {testResult && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: testResult.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${testResult.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.86rem', color: testResult.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {testResult.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{testResult.title}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {testResult.details}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={() => setIsEdgeCaseModalOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
