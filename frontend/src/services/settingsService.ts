export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  is_initial: boolean;
  is_won: boolean;
  is_lost: boolean;
}

export interface LossReason {
  id: string;
  name: string;
}

export interface SettingsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class SettingsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SettingsResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async getCustomStatuses(token: string): Promise<SettingsResponse<{ statuses: CustomStatus[] }>> {
    return this.makeRequest('/settings/statuses', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateCustomStatuses(
    token: string,
    statuses: CustomStatus[]
  ): Promise<SettingsResponse<{ message: string }>> {
    return this.makeRequest('/settings/statuses', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ statuses }),
    });
  }

  async getLossReasons(token: string): Promise<SettingsResponse<{ lossReasons: LossReason[] }>> {
    return this.makeRequest('/settings/loss-reasons', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateLossReasons(
    token: string,
    lossReasons: LossReason[]
  ): Promise<SettingsResponse<{ message: string }>> {
    return this.makeRequest('/settings/loss-reasons', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ lossReasons }),
    });
  }

  // General settings methods for future use
  async getSettings(token: string): Promise<SettingsResponse<any>> {
    return this.makeRequest('/settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateSettings(
    token: string,
    settings: Record<string, any>
  ): Promise<SettingsResponse<{ message: string }>> {
    return this.makeRequest('/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
  }

  // Validation helpers
  static validateStatus(status: Partial<CustomStatus>): string[] {
    const errors: string[] = [];

    if (!status.name?.trim()) {
      errors.push('Nome do status é obrigatório');
    }

    if (!status.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
      errors.push('Cor deve ser um código hexadecimal válido');
    }

    if (typeof status.order !== 'number' || status.order < 0) {
      errors.push('Ordem deve ser um número positivo');
    }

    return errors;
  }

  static validateLossReason(reason: Partial<LossReason>): string[] {
    const errors: string[] = [];

    if (!reason.name?.trim()) {
      errors.push('Nome do motivo é obrigatório');
    }

    if (!reason.id?.trim()) {
      errors.push('ID do motivo é obrigatório');
    }

    return errors;
  }

  static validateStatusList(statuses: CustomStatus[]): string[] {
    const errors: string[] = [];

    if (statuses.length === 0) {
      errors.push('Pelo menos um status deve estar configurado');
    }

    const initialStatuses = statuses.filter(s => s.is_initial);
    if (initialStatuses.length === 0) {
      errors.push('Pelo menos um status deve ser marcado como inicial');
    } else if (initialStatuses.length > 1) {
      errors.push('Apenas um status pode ser marcado como inicial');
    }

    const ids = statuses.map(s => s.id);
    if (new Set(ids).size !== ids.length) {
      errors.push('IDs dos status devem ser únicos');
    }

    const names = statuses.map(s => s.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      errors.push('Nomes dos status devem ser únicos');
    }

    return errors;
  }
}

const settingsServiceInstance = new SettingsService();

export { SettingsService };
export default settingsServiceInstance;