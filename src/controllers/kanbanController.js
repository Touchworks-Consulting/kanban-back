const { KanbanColumn, Lead, Tag } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { processSequelizeResponse } = require('../utils/dateSerializer');
const { Op } = require('sequelize');

const kanbanController = {
  // Listar colunas
  listColumns: asyncHandler(async (req, res) => {
    // Ensure default columns exist for the account
    const existingCount = await KanbanColumn.count({
      where: { account_id: req.account.id }
    });
    if (existingCount === 0) {
      const defaults = [
        { name: 'Leads Entrantes', position: 0, color: '#3b82f6', is_system: true },
        { name: 'Contactado', position: 1, color: '#f59e0b' },
        { name: 'Qualificado', position: 2, color: '#8b5cf6' },
        { name: 'Proposta', position: 3, color: '#06b6d4' },
        { name: 'Ganhos', position: 4, color: '#10b981' },
        { name: 'Perdidos', position: 5, color: '#ef4444' }
      ];
      await Promise.all(
        defaults.map((c) => KanbanColumn.create({ ...c, account_id: req.account.id }))
      );
      // Create a few sample leads in first column to visualize the board quickly
      const inbox = await KanbanColumn.findOne({ where: { account_id: req.account.id, position: 0 } });
      if (inbox) {
        await Promise.all([
          Lead.create({ account_id: req.account.id, name: 'João Silva', phone: '11999999999', platform: 'google', campaign: 'Orçamento', status: 'new', column_id: inbox.id, position: 1, value: 1500.0 }),
          Lead.create({ account_id: req.account.id, name: 'Maria Souza', email: 'maria@example.com', platform: 'facebook', campaign: 'Curso Online', status: 'new', column_id: inbox.id, position: 2, value: 0 }),
          Lead.create({ account_id: req.account.id, name: 'Empresa XYZ', phone: '1133334444', platform: 'linkedin', campaign: 'Consultoria', status: 'new', column_id: inbox.id, position: 3, value: 5000.0 })
        ]);
      }
    }

    const columns = await KanbanColumn.findAll({
      where: {
        account_id: req.account.id,
        is_active: true
      },
      include: [
        {
          model: Lead,
          as: 'leads',
          attributes: ['id', 'name', 'phone', 'email', 'platform', 'campaign', 'status', 'position', 'value', 'column_id', 'account_id', 'created_at', 'updated_at'],
          include: [
            {
              model: require('../models').Tag,
              as: 'tags',
              attributes: ['id', 'name', 'color'],
              through: { attributes: [] }
            }
          ],
          order: [['position', 'ASC'], ['created_at', 'DESC']]
        }
      ],
      order: [['position', 'ASC']]
    });

    res.json({ columns: processSequelizeResponse(columns) });
  }),

  // Criar coluna
  createColumn: asyncHandler(async (req, res) => {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Nome da coluna é obrigatório'
      });
    }

    // Verificar se já existe uma coluna com o mesmo nome
    const existingColumn = await KanbanColumn.findOne({
      where: {
        account_id: req.account.id,
        name
      }
    });

    if (existingColumn) {
      return res.status(409).json({
        error: 'Já existe uma coluna com este nome'
      });
    }

    // Obter próxima posição
    const maxPosition = await KanbanColumn.max('position', {
      where: {
        account_id: req.account.id
      }
    }) || 0;

    const column = await KanbanColumn.create({
      account_id: req.account.id,
      name,
      color: color || '#6b7280',
      position: maxPosition + 1
    });

    res.status(201).json({
      message: 'Coluna criada com sucesso',
      column
    });
  }),

  // Atualizar coluna
  updateColumn: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, color, position } = req.body;

    const column = await KanbanColumn.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!column) {
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

    await column.update(updateData);

    res.json({
      message: 'Coluna atualizada com sucesso',
      column
    });
  }),

  // Deletar coluna
  deleteColumn: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const column = await KanbanColumn.findOne({
      where: {
        id,
        account_id: req.account.id
      }
    });

    if (!column) {
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
    const leadsCount = await Lead.count({
      where: {
        column_id: id
      }
    });

    if (leadsCount > 0) {
      return res.status(400).json({
        error: `Não é possível deletar a coluna. Há ${leadsCount} lead(s) nesta coluna.`,
        details: 'Mova os leads para outra coluna antes de deletar.'
      });
    }

    await column.destroy();

    res.json({
      message: 'Coluna deletada com sucesso'
    });
  }),

  // Reordenar colunas
  reorderColumns: asyncHandler(async (req, res) => {
    const { columnOrders } = req.body; // Array de { id, position }

    if (!Array.isArray(columnOrders)) {
      return res.status(400).json({
        error: 'columnOrders deve ser um array'
      });
    }

    // Verificar se todas as colunas pertencem à conta
    const columnIds = columnOrders.map(item => item.id);
    const columns = await KanbanColumn.findAll({
      where: {
        id: columnIds,
        account_id: req.account.id
      }
    });

    if (columns.length !== columnIds.length) {
      return res.status(400).json({
        error: 'Uma ou mais colunas não foram encontradas'
      });
    }

    // Atualizar posições
    const updatePromises = columnOrders.map(({ id, position }) =>
      KanbanColumn.update(
        { position },
        { where: { id, account_id: req.account.id } }
      )
    );

    await Promise.all(updatePromises);

    // Retornar colunas atualizadas
    const updatedColumns = await KanbanColumn.findAll({
      where: {
        account_id: req.account.id,
        is_active: true
      },
      order: [['position', 'ASC']]
    });

    res.json({
      message: 'Colunas reordenadas com sucesso',
      columns: updatedColumns
    });
  }),

  // Obter board completo (colunas + leads)
  getBoard: asyncHandler(async (req, res) => {
    const { search, platform, period, dateStart, dateEnd, valueRange, tags } = req.query;
    
    console.log('Backend getBoard - parâmetros recebidos:', {
      search,
      platform,
      period,
      dateStart,
      dateEnd,
      valueRange,
      tags
    });
    
    // Ensure defaults if none exist yet
    const count = await KanbanColumn.count({ where: { account_id: req.account.id } });
    if (count === 0) {
      const defaults = [
        { name: 'Leads Entrantes', position: 0, color: '#3b82f6', is_system: true },
        { name: 'Contactado', position: 1, color: '#f59e0b' },
        { name: 'Qualificado', position: 2, color: '#8b5cf6' },
        { name: 'Proposta', position: 3, color: '#06b6d4' },
        { name: 'Ganhos', position: 4, color: '#10b981' },
        { name: 'Perdidos', position: 5, color: '#ef4444' }
      ];
      await Promise.all(defaults.map((c) => KanbanColumn.create({ ...c, account_id: req.account.id })));
    }

    // Build lead filters
    const leadFilters = {};

    // Search filter
    if (search) {
      // Verificar se é busca numérica (apenas dígitos)
      const isNumericSearch = /^\d+$/.test(search);
      
      if (isNumericSearch) {
        // Para busca numérica, buscar apenas em telefone (sem formatação)
        leadFilters[Op.or] = [
          { phone: { [Op.like]: `%${search}%` } }
        ];
      } else {
        // Para busca de texto, buscar em todos os campos
        leadFilters[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    // Platform filter
    if (platform && platform !== 'all') {
      leadFilters.platform = platform;
    }

    // Value range filter
    if (valueRange && valueRange !== 'all') {
      switch (valueRange) {
        case '0-500':
          leadFilters.value = { [Op.between]: [0, 500] };
          break;
        case '500-2000':
          leadFilters.value = { [Op.between]: [500, 2000] };
          break;
        case '2000-5000':
          leadFilters.value = { [Op.between]: [2000, 5000] };
          break;
        case '5000+':
          leadFilters.value = { [Op.gte]: 5000 };
          break;
      }
    }

    // Period filter
    if (period && period !== 'all') {
      console.log('Backend - processando filtro de período:', { period, dateStart, dateEnd });
      
      if (period === 'custom' && dateStart && dateEnd) {
        // Custom date range
        const startDate = new Date(dateStart);
        const endDate = new Date(dateEnd);
        endDate.setHours(23, 59, 59, 999); // Include full end date
        
        console.log('Backend - filtro customizado de data:', {
          originalDateStart: dateStart,
          originalDateEnd: dateEnd,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        leadFilters.created_at = { 
          [Op.between]: [startDate, endDate] 
        };
        
        console.log('Backend - filtro aplicado:', leadFilters);
      } else {
        // Predefined periods
        const now = new Date();
        let startDate;
        
        switch (period) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case '3months':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        if (startDate) {
          leadFilters.created_at = { [Op.gte]: startDate };
        }
      }
    } else if (dateStart && dateEnd) {
      // Direct date range without period parameter (fallback)
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);
      endDate.setHours(23, 59, 59, 999);
      
      leadFilters.created_at = { 
        [Op.between]: [startDate, endDate] 
      };
    }

    // Build include for leads with filters
    const leadInclude = {
      model: Lead,
      as: 'leads',
      where: Object.keys(leadFilters).length > 0 ? leadFilters : undefined,
      required: false, // Use LEFT JOIN to include columns even without leads
      include: [
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] }
        }
      ],
      order: [['position', 'ASC'], ['created_at', 'DESC']]
    };

    // Tag filter (more complex, requires join)
    if (tags && tags.length > 0) {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      leadInclude.include[0].where = {
        id: { [Op.in]: tagIds }
      };
      leadInclude.include[0].required = true;
    }

    const columns = await KanbanColumn.findAll({
      where: {
        account_id: req.account.id,
        is_active: true
      },
      include: [leadInclude],
      order: [['position', 'ASC']]
    });

    res.json({ 
      board: {
        columns: processSequelizeResponse(columns),
        account: {
          id: req.account.id,
          name: req.account.name
        }
      }
    });
  })
};

module.exports = kanbanController;
