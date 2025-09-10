const memoryDb = require('../database/memory-db');

const kanbanController = {
  // Obter board completo (colunas + leads)
  getBoard: async (req, res) => {
    try {
      const accountId = req.account.id;

      const columns = memoryDb.findColumns({
        account_id: accountId,
        is_active: true
      });

      const leads = memoryDb.findLeads({
        account_id: accountId
      });

      // Agrupar leads por coluna
      const columnsWithLeads = columns.map(column => ({
        ...column,
        leads: leads.filter(lead => lead.column_id === column.id)
      }));

      res.json({ 
        board: {
          columns: columnsWithLeads,
          account: {
            id: req.account.id,
            name: req.account.name
          }
        }
      });
    } catch (error) {
      console.error('Error getting board:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Listar colunas
  listColumns: async (req, res) => {
    try {
      const accountId = req.account.id;
      
      const columns = memoryDb.findColumns({
        account_id: accountId,
        is_active: true
      });

      const leads = memoryDb.findLeads({
        account_id: accountId
      });

      // Agrupar leads por coluna
      const columnsWithLeads = columns.map(column => ({
        ...column,
        leads: leads.filter(lead => lead.column_id === column.id)
      }));

      res.json({ columns: columnsWithLeads });
    } catch (error) {
      console.error('Error listing columns:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Criar coluna
  createColumn: async (req, res) => {
    try {
      const { name, color } = req.body;
      const accountId = req.account.id;

      if (!name) {
        return res.status(400).json({
          error: 'Nome da coluna é obrigatório'
        });
      }

      // Verificar se já existe uma coluna com o mesmo nome
      const existingColumns = memoryDb.findColumns({ account_id: accountId });
      if (existingColumns.some(col => col.name === name)) {
        return res.status(409).json({
          error: 'Já existe uma coluna com este nome'
        });
      }

      // Obter próxima posição
      const maxPosition = Math.max(...existingColumns.map(col => col.position), -1);

      const column = memoryDb.createColumn({
        account_id: accountId,
        name,
        color: color || '#6b7280',
        position: maxPosition + 1,
        is_system: false,
        is_active: true
      });

      res.status(201).json({
        message: 'Coluna criada com sucesso',
        column
      });
    } catch (error) {
      console.error('Error creating column:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualizar coluna
  updateColumn: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, position } = req.body;
      const accountId = req.account.id;

      const column = memoryDb.findColumn({ id });

      if (!column || column.account_id !== accountId) {
        return res.status(404).json({
          error: 'Coluna não encontrada'
        });
      }

      // Não permitir editar colunas do sistema
      if (column.is_system && name && name !== column.name) {
        return res.status(400).json({
          error: 'Não é possível alterar o nome de colunas do sistema'
        });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (color) updateData.color = color;
      if (position !== undefined) updateData.position = position;

      const updatedColumn = memoryDb.updateColumn(id, updateData);

      res.json({
        message: 'Coluna atualizada com sucesso',
        column: updatedColumn
      });
    } catch (error) {
      console.error('Error updating column:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Deletar coluna
  deleteColumn: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;

      const column = memoryDb.findColumn({ id });

      if (!column || column.account_id !== accountId) {
        return res.status(404).json({
          error: 'Coluna não encontrada'
        });
      }

      // Não permitir deletar colunas do sistema
      if (column.is_system) {
        return res.status(400).json({
          error: 'Não é possível deletar colunas do sistema'
        });
      }

      // Verificar se há leads nesta coluna
      const leads = memoryDb.findLeads({ column_id: id });
      if (leads.length > 0) {
        return res.status(400).json({
          error: `Não é possível deletar a coluna. Há ${leads.length} lead(s) nesta coluna.`,
          details: 'Mova os leads para outra coluna antes de deletar.'
        });
      }

      memoryDb.deleteColumn(id);

      res.json({
        message: 'Coluna deletada com sucesso'
      });
    } catch (error) {
      console.error('Error deleting column:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Reordenar colunas
  reorderColumns: async (req, res) => {
    try {
      const { columnOrders } = req.body;
      const accountId = req.account.id;

      if (!Array.isArray(columnOrders)) {
        return res.status(400).json({
          error: 'columnOrders deve ser um array'
        });
      }

      // Atualizar posições
      for (const { id, position } of columnOrders) {
        const column = memoryDb.findColumn({ id });
        if (column && column.account_id === accountId) {
          memoryDb.updateColumn(id, { position });
        }
      }

      // Retornar colunas atualizadas
      const updatedColumns = memoryDb.findColumns({
        account_id: accountId,
        is_active: true
      });

      res.json({
        message: 'Colunas reordenadas com sucesso',
        columns: updatedColumns
      });
    } catch (error) {
      console.error('Error reordering columns:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = kanbanController;