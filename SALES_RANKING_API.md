# API de Ranking de Vendedores

Esta documentação descreve os endpoints implementados para o sistema de ranking de vendedores.

## Endpoints Disponíveis

### 1. Dados da Tabela de Ranking
**GET** `/api/dashboard/sales-ranking`

Retorna os dados completos para a tabela de ranking de vendedores.

**Query Parameters:**
- `start_date` (opcional): Data inicial no formato YYYY-MM-DD
- `end_date` (opcional): Data final no formato YYYY-MM-DD

**Response:**
```json
{
  "salesRanking": [
    {
      "id": "uuid-do-usuario",
      "name": "Nome do Vendedor",
      "email": "email@exemplo.com",
      "newLeadsAssigned": 15,
      "leadsWon": 8,
      "conversionRate": 53.33,
      "activitiesCount": 45,
      "totalRevenue": "12500.00"
    }
  ]
}
```

### 2. Dados do Gráfico de Barras
**GET** `/api/dashboard/sales-performance-chart`

Retorna dados formatados para o gráfico de barras de leads ganhos por vendedor.

**Query Parameters:**
- `start_date` (opcional): Data inicial no formato YYYY-MM-DD
- `end_date` (opcional): Data final no formato YYYY-MM-DD

**Response:**
```json
{
  "chartData": [
    {
      "name": "João Silva",
      "leadsWon": 8,
      "totalRevenue": 12500.00,
      "conversionRate": 53.33
    }
  ]
}
```

### 3. Dados do Gráfico de Dispersão
**GET** `/api/dashboard/activity-conversion-scatter`

Retorna dados para o gráfico de dispersão (Atividades vs Taxa de Conversão).

**Query Parameters:**
- `start_date` (opcional): Data inicial no formato YYYY-MM-DD
- `end_date` (opcional): Data final no formato YYYY-MM-DD

**Response:**
```json
{
  "scatterData": [
    {
      "x": 45,
      "y": 53.33,
      "name": "João Silva",
      "leadsWon": 8,
      "newLeadsAssigned": 15
    }
  ]
}
```

## Estrutura do Banco de Dados

### Campos Adicionados ao Lead
- `assigned_to_user_id`: UUID do usuário responsável pelo lead

### Nova Tabela: lead_activities
```sql
- id: UUID (PK)
- account_id: UUID (FK para accounts)
- lead_id: UUID (FK para leads)
- user_id: UUID (FK para users)
- activity_type: ENUM('call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up')
- title: VARCHAR(255)
- description: TEXT
- duration_minutes: INTEGER
- status: ENUM('pending', 'completed', 'cancelled')
- scheduled_for: TIMESTAMP
- completed_at: TIMESTAMP
```

## Exemplo de Uso com React + Recharts

### SalesRankingTable Component
```jsx
import React, { useState, useEffect } from 'react';

const SalesRankingTable = ({ startDate, endDate }) => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`/api/dashboard/sales-ranking?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        setSalesData(data.salesRanking);
      } catch (error) {
        console.error('Erro ao carregar ranking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (loading) return <div>Carregando...</div>;

  return (
    <table className="sales-ranking-table">
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Novos Leads Atribuídos</th>
          <th>Leads Ganhos</th>
          <th>Taxa de Conversão (%)</th>
          <th>Atividades Realizadas</th>
          <th>Receita Total</th>
        </tr>
      </thead>
      <tbody>
        {salesData.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.newLeadsAssigned}</td>
            <td>{user.leadsWon}</td>
            <td>{user.conversionRate.toFixed(2)}%</td>
            <td>{user.activitiesCount}</td>
            <td>R$ {parseFloat(user.totalRevenue).toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### SalesPerformanceChart Component
```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SalesPerformanceChart = ({ startDate, endDate }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`/api/dashboard/sales-performance-chart?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        setChartData(data.chartData);
      } catch (error) {
        console.error('Erro ao carregar gráfico:', error);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value, name) => {
          if (name === 'leadsWon') return [value, 'Leads Ganhos'];
          if (name === 'totalRevenue') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita Total'];
          return [value, name];
        }} />
        <Bar dataKey="leadsWon" fill="#8884d8" name="Leads Ganhos" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

### ActivityConversionScatter Component
```jsx
import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ActivityConversionScatter = ({ startDate, endDate }) => {
  const [scatterData, setScatterData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`/api/dashboard/activity-conversion-scatter?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        setScatterData(data.scatterData);
      } catch (error) {
        console.error('Erro ao carregar scatter plot:', error);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart data={scatterData}>
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name="Atividades" />
        <YAxis type="number" dataKey="y" name="Taxa de Conversão (%)" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => {
            if (name === 'Taxa de Conversão (%)') return [`${value.toFixed(2)}%`, name];
            return [value, name];
          }}
          labelFormatter={(value) => `Vendedor: ${scatterData.find(d => d.x === value || d.y === value)?.name || ''}`}
        />
        <Scatter dataKey="y" fill="#8884d8" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};
```

## Autenticação

Todos os endpoints requerem autenticação via JWT token no header:
```
Authorization: Bearer <seu-jwt-token>
```

## Status da Implementação

✅ **Backend Completo:**
- Migrations de banco de dados
- Models e associations
- Business logic no DashboardService
- Controllers com tratamento de erros
- Routes configuradas
- Autenticação e autorização

⏳ **Frontend (a implementar):**
- Componentes React para tabela e gráficos
- Integração com API
- Filtros de data
- Responsividade