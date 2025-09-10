const memoryDb = require('../database/memory-db');

const leadController = {
  // Listar leads com filtros
  list: async (req, res) => {
    try {
      const { page = 1, limit = 20, status, platform, search, column_id } = req.query;
      const accountId = req.account.id;

      let leads = memoryDb.findLeads({ account_id: accountId });

      // Aplicar filtros
      if (status) {
        leads = leads.filter(lead => lead.status === status);
      }
      if (platform) {
        leads = leads.filter(lead => lead.platform === platform);
      }
      if (column_id) {
        leads = leads.filter(lead => lead.column_id === column_id);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        leads = leads.filter(lead => 
          (lead.name && lead.name.toLowerCase().includes(searchLower)) ||
          (lead.phone && lead.phone.includes(search)) ||
          (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
          (lead.message && lead.message.toLowerCase().includes(searchLower))
        );
      }

      // Paginação
      const offset = (page - 1) * limit;
      const paginatedLeads = leads.slice(offset, offset + parseInt(limit));

      // Adicionar dados da coluna
      const leadsWithColumn = paginatedLeads.map(lead => {
        const column = memoryDb.findColumn({ id: lead.column_id });
        return {
          ...lead,
          column: column ? { id: column.id, name: column.name, color: column.color } : null
        };
      });

      res.json({
        leads: leadsWithColumn,
        pagination: {
          total: leads.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(leads.length / limit)
        }
      });
    } catch (error) {
      console.error('Error listing leads:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Obter lead por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;

      const lead = memoryDb.findLead({ id });

      if (!lead || lead.account_id !== accountId) {
        return res.status(404).json({
          error: 'Lead não encontrado'
        });
      }

      // Adicionar dados da coluna
      const column = memoryDb.findColumn({ id: lead.column_id });
      const leadWithColumn = {
        ...lead,
        column: column ? { id: column.id, name: column.name, color: column.color } : null
      };

      res.json({ lead: leadWithColumn });
    } catch (error) {
      console.error('Error getting lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Criar novo lead
  create: async (req, res) => {
    try {
      const leadData = { ...req.body };
      leadData.account_id = req.account.id;

      // Se não especificou coluna, usar a coluna "Leads Entrantes"
      if (!leadData.column_id) {
        const columns = memoryDb.findColumns({ 
          account_id: req.account.id, 
          is_active: true 
        });
        const defaultColumn = columns.find(col => col.is_system);
        if (defaultColumn) {
          leadData.column_id = defaultColumn.id;
        }
      }

      // Definir posição se não especificada
      if (leadData.column_id && !leadData.position) {
        const leadsInColumn = memoryDb.findLeads({
          account_id: req.account.id,
          column_id: leadData.column_id
        });
        const maxPosition = Math.max(...leadsInColumn.map(l => l.position), 0);
        leadData.position = maxPosition + 1;
      }

      // Definir status padrão
      if (!leadData.status) {
        leadData.status = 'new';
      }

      const lead = memoryDb.createLead(leadData);

      // Adicionar dados da coluna
      const column = memoryDb.findColumn({ id: lead.column_id });
      const createdLead = {
        ...lead,
        column: column ? { id: column.id, name: column.name, color: column.color } : null
      };

      res.status(201).json({
        message: 'Lead criado com sucesso',
        lead: createdLead
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualizar lead
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      const accountId = req.account.id;

      const lead = memoryDb.findLead({ id });

      if (!lead || lead.account_id !== accountId) {
        return res.status(404).json({
          error: 'Lead não encontrado'
        });
      }

      // Atualizar posição se mudou de coluna
      if (updateData.column_id && updateData.column_id !== lead.column_id) {
        const leadsInNewColumn = memoryDb.findLeads({
          account_id: accountId,
          column_id: updateData.column_id
        });
        const maxPosition = Math.max(...leadsInNewColumn.map(l => l.position), 0);
        updateData.position = maxPosition + 1;
      }

      const updatedLead = memoryDb.updateLead(id, updateData);

      // Adicionar dados da coluna
      const column = memoryDb.findColumn({ id: updatedLead.column_id });
      const leadWithColumn = {
        ...updatedLead,
        column: column ? { id: column.id, name: column.name, color: column.color } : null
      };

      res.json({
        message: 'Lead atualizado com sucesso',
        lead: leadWithColumn
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Deletar lead
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const accountId = req.account.id;

      const lead = memoryDb.findLead({ id });

      if (!lead || lead.account_id !== accountId) {
        return res.status(404).json({
          error: 'Lead não encontrado'
        });
      }

      memoryDb.deleteLead(id);

      res.json({
        message: 'Lead deletado com sucesso'
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Mover lead para outra coluna/posição
  move: async (req, res) => {
    try {
      const { id } = req.params;
      const { column_id, position } = req.body;
      const accountId = req.account.id;

      const lead = memoryDb.findLead({ id });

      if (!lead || lead.account_id !== accountId) {
        return res.status(404).json({
          error: 'Lead não encontrado'
        });
      }

      // Verificar se a coluna pertence à conta
      const column = memoryDb.findColumn({ id: column_id });
      if (!column || column.account_id !== accountId) {
        return res.status(404).json({
          error: 'Coluna não encontrada'
        });
      }

      const updatedLead = memoryDb.updateLead(id, {
        column_id,
        position: position || 0
      });

      // Adicionar dados da coluna
      const leadWithColumn = {
        ...updatedLead,
        column: { id: column.id, name: column.name, color: column.color }
      };

      res.json({
        message: 'Lead movido com sucesso',
        lead: leadWithColumn
      });
    } catch (error) {
      console.error('Error moving lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

module.exports = leadController;