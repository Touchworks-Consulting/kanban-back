import React, { useState, useEffect } from 'react';
import settingsService, { CustomStatus, LossReason, SettingsService } from '../../services/settingsService';
import './StatusSettings.css';

interface StatusSettingsProps {
  accountId: string;
  token: string;
}

const StatusSettings: React.FC<StatusSettingsProps> = ({ accountId, token }) => {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingLossReason, setEditingLossReason] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStatuses(), loadLossReasons()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    const response = await settingsService.getCustomStatuses(token);
    if (response.success && response.data) {
      setStatuses(response.data.statuses || []);
    } else {
      throw new Error(response.error || 'Failed to load statuses');
    }
  };

  const loadLossReasons = async () => {
    const response = await settingsService.getLossReasons(token);
    if (response.success && response.data) {
      setLossReasons(response.data.lossReasons || []);
    } else {
      throw new Error(response.error || 'Failed to load loss reasons');
    }
  };

  const saveStatuses = async (newStatuses: CustomStatus[]) => {
    // Validate before saving
    const validationErrs = SettingsService.validateStatusList(newStatuses);
    if (validationErrs.length > 0) {
      setValidationErrors(validationErrs);
      return;
    }

    setSaving(true);
    setValidationErrors([]);

    try {
      const response = await settingsService.updateCustomStatuses(token, newStatuses);
      if (response.success) {
        setStatuses(newStatuses);
        setError(null);
      } else {
        setError(response.error || 'Erro ao salvar status');
      }
    } catch (err) {
      console.error('Error saving statuses:', err);
      setError('Erro ao salvar status');
    } finally {
      setSaving(false);
    }
  };

  const saveLossReasons = async (newLossReasons: LossReason[]) => {
    setSaving(true);
    try {
      const response = await settingsService.updateLossReasons(token, newLossReasons);
      if (response.success) {
        setLossReasons(newLossReasons);
        setError(null);
      } else {
        setError(response.error || 'Erro ao salvar motivos de perda');
      }
    } catch (err) {
      console.error('Error saving loss reasons:', err);
      setError('Erro ao salvar motivos de perda');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = (statusId: string, field: keyof CustomStatus, value: any) => {
    const updatedStatuses = statuses.map(status =>
      status.id === statusId ? { ...status, [field]: value } : status
    );

    // Ensure only one status is marked as initial
    if (field === 'is_initial' && value === true) {
      updatedStatuses.forEach(status => {
        if (status.id !== statusId) {
          status.is_initial = false;
        }
      });
    }

    setStatuses(updatedStatuses);
  };

  const handleLossReasonUpdate = (reasonId: string, field: keyof LossReason, value: any) => {
    const updatedReasons = lossReasons.map(reason =>
      reason.id === reasonId ? { ...reason, [field]: value } : reason
    );
    setLossReasons(updatedReasons);
  };

  const addNewStatus = () => {
    const newStatus: CustomStatus = {
      id: `status_${Date.now()}`,
      name: 'Novo Status',
      color: '#6366f1',
      order: Math.max(...statuses.map(s => s.order), 0) + 1,
      is_initial: false,
      is_won: false,
      is_lost: false
    };
    setStatuses([...statuses, newStatus]);
    setEditingStatus(newStatus.id);
  };

  const addNewLossReason = () => {
    const newReason: LossReason = {
      id: `reason_${Date.now()}`,
      name: 'Novo Motivo'
    };
    setLossReasons([...lossReasons, newReason]);
    setEditingLossReason(newReason.id);
  };

  const deleteStatus = (statusId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este status?')) {
      const updatedStatuses = statuses.filter(s => s.id !== statusId);
      setStatuses(updatedStatuses);
    }
  };

  const deleteLossReason = (reasonId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motivo?')) {
      const updatedReasons = lossReasons.filter(r => r.id !== reasonId);
      setLossReasons(updatedReasons);
    }
  };

  const moveStatus = (statusId: string, direction: 'up' | 'down') => {
    const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);
    const currentIndex = sortedStatuses.findIndex(s => s.id === statusId);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedStatuses.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Swap orders
    const temp = sortedStatuses[currentIndex].order;
    sortedStatuses[currentIndex].order = sortedStatuses[newIndex].order;
    sortedStatuses[newIndex].order = temp;

    setStatuses(sortedStatuses);
  };

  if (loading) {
    return <div className="status-settings-loading">Carregando configurações...</div>;
  }

  return (
    <div className="status-settings">
      <div className="status-settings-header">
        <h2>Configurações de Status</h2>
        <p>Personalize os status dos seus leads e motivos de perda</p>
      </div>

      {error && (
        <div className="status-settings-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="status-settings-error">
          <div>
            <strong>Erros de validação:</strong>
            <ul>
              {validationErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setValidationErrors([])}>×</button>
        </div>
      )}

      <div className="status-settings-section">
        <div className="section-header">
          <h3>Status dos Leads</h3>
          <button
            className="btn-primary"
            onClick={addNewStatus}
            disabled={saving}
          >
            + Novo Status
          </button>
        </div>

        <div className="status-list">
          {statuses
            .sort((a, b) => a.order - b.order)
            .map((status) => (
            <div key={status.id} className="status-item">
              <div className="status-item-content">
                <div className="status-order-controls">
                  <button
                    onClick={() => moveStatus(status.id, 'up')}
                    className="order-btn"
                    title="Mover para cima"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStatus(status.id, 'down')}
                    className="order-btn"
                    title="Mover para baixo"
                  >
                    ↓
                  </button>
                </div>

                <div className="status-color">
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => handleStatusUpdate(status.id, 'color', e.target.value)}
                  />
                </div>

                <div className="status-name">
                  {editingStatus === status.id ? (
                    <input
                      type="text"
                      value={status.name}
                      onChange={(e) => handleStatusUpdate(status.id, 'name', e.target.value)}
                      onBlur={() => setEditingStatus(null)}
                      onKeyPress={(e) => e.key === 'Enter' && setEditingStatus(null)}
                      autoFocus
                    />
                  ) : (
                    <span onClick={() => setEditingStatus(status.id)}>
                      {status.name}
                    </span>
                  )}
                </div>

                <div className="status-flags">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={status.is_initial}
                      onChange={(e) => handleStatusUpdate(status.id, 'is_initial', e.target.checked)}
                    />
                    Inicial
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={status.is_won}
                      onChange={(e) => handleStatusUpdate(status.id, 'is_won', e.target.checked)}
                    />
                    Ganho
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={status.is_lost}
                      onChange={(e) => handleStatusUpdate(status.id, 'is_lost', e.target.checked)}
                    />
                    Perdido
                  </label>
                </div>

                <button
                  className="delete-btn"
                  onClick={() => deleteStatus(status.id)}
                  title="Excluir status"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn-success"
          onClick={() => saveStatuses(statuses)}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Status'}
        </button>
      </div>

      <div className="status-settings-section">
        <div className="section-header">
          <h3>Motivos de Perda</h3>
          <button
            className="btn-primary"
            onClick={addNewLossReason}
            disabled={saving}
          >
            + Novo Motivo
          </button>
        </div>

        <div className="loss-reasons-list">
          {lossReasons.map((reason) => (
            <div key={reason.id} className="loss-reason-item">
              <div className="loss-reason-name">
                {editingLossReason === reason.id ? (
                  <input
                    type="text"
                    value={reason.name}
                    onChange={(e) => handleLossReasonUpdate(reason.id, 'name', e.target.value)}
                    onBlur={() => setEditingLossReason(null)}
                    onKeyPress={(e) => e.key === 'Enter' && setEditingLossReason(null)}
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setEditingLossReason(reason.id)}>
                    {reason.name}
                  </span>
                )}
              </div>

              <button
                className="delete-btn"
                onClick={() => deleteLossReason(reason.id)}
                title="Excluir motivo"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <button
          className="btn-success"
          onClick={() => saveLossReasons(lossReasons)}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Motivos'}
        </button>
      </div>
    </div>
  );
};

export default StatusSettings;