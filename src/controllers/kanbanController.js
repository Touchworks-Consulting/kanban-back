const { KanbanColumn, Lead, Tag, LeadHistory, LeadActivity } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { processSequelizeResponse } = require('../utils/dateSerializer');
const { Op, literal } = require('sequelize');

const kanbanController = {
  // Listar colunas
  listColumns: asyncHandler(async (req, res) => {
    console.log(`🏗️ listColumns: Usuário ${req.user?.email}, Account: ${req.account?.name || 'null'}`);

    if (!req.account || !req.account.id) {
      console.log('❌ req.account é null ou sem id:', req.account);
      return res.status(400).json({
        error: 'Conta não definida. Verifique se você tem acesso a uma conta ativa.'
      });
    }

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
        const sampleLeads = [
          { account_id: req.account.id, name: 'João Silva', phone: '11999999999', platform: 'google', campaign: 'Orçamento', status: 'new', column_id: inbox.id, position: 1, value: 1500.0 },
          { account_id: req.account.id, name: 'Maria Souza', email: 'maria@example.com', platform: 'facebook', campaign: 'Curso Online', status: 'new', column_id: inbox.id, position: 2, value: 0 },
          { account_id: req.account.id, name: 'Empresa XYZ', phone: '1133334444', platform: 'linkedin', campaign: 'Consultoria', status: 'new', column_id: inbox.id, position: 3, value: 5000.0 }
        ];

        for (const leadData of sampleLeads) {
          const lead = await Lead.create(leadData);

          // 📊 REGISTRAR HISTÓRICO: Lead criado em uma coluna
          await LeadHistory.create({
            lead_id: lead.id,
            account_id: req.account.id,
            from_column_id: null, // null indica criação
            to_column_id: leadData.column_id,
            action_type: 'created',
            moved_at: new Date(),
            metadata: {
              leadName: lead.name,
              initialStatus: leadData.status,
              createdBy: 'system'
            }
          });
        }
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
    const { search, platform, period, dateStart, dateEnd, valueRange, tags, sortBy = 'updated_desc' } = req.query;
    
    console.log('🔍 Backend getBoard - parâmetros recebidos:', {
      search: search || 'VAZIO',
      searchType: typeof search,
      searchLength: search ? search.length : 0,
      platform,
      period,
      dateStart,
      dateEnd,
      valueRange,
      tags,
      sortBy
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
    if (search && search.trim() !== '') {
      console.log('🔍 Aplicando filtro de busca:', search);
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

    // Log dos filtros construídos
    console.log('🔍 Filtros de leads construídos:', {
      totalFiltros: Object.keys(leadFilters).length,
      filtros: JSON.stringify(leadFilters, null, 2),
      leadFiltersKeys: Object.keys(leadFilters),
      willApplyFilter: Object.keys(leadFilters).length > 0
    });

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
      ]
    };

    // Tag filter (more complex, requires join)
    if (tags && tags.length > 0) {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      leadInclude.include[0].where = {
        id: { [Op.in]: tagIds }
      };
      leadInclude.include[0].required = true;
    }

    // Function to convert sortBy parameter to Sequelize order
    const getSortOrder = (sortBy) => {
      switch (sortBy) {
        case 'updated_desc':
          return [['updatedAt', 'DESC']];
        case 'updated_asc':
          return [['updatedAt', 'ASC']];
        case 'activity_asc':
          // Ordenar por próxima atividade pendente (mais próxima primeiro)
          // Usar o subquery diretamente no ORDER BY
          return [[
            literal(`(
              SELECT MIN(scheduled_for)
              FROM lead_activities
              WHERE lead_activities.lead_id = leads.id
              AND lead_activities.status = 'pending'
              AND lead_activities.scheduled_for >= NOW()
            )`),
            'ASC NULLS LAST'
          ]];
        case 'activity_desc':
          // Ordenar por próxima atividade pendente (mais distante primeiro)
          return [[
            literal(`(
              SELECT MIN(scheduled_for)
              FROM lead_activities
              WHERE lead_activities.lead_id = leads.id
              AND lead_activities.status = 'pending'
              AND lead_activities.scheduled_for >= NOW()
            )`),
            'DESC NULLS LAST'
          ]];
        case 'title_asc':
          return [['name', 'ASC']];
        case 'title_desc':
          return [['name', 'DESC']];
        case 'value_desc':
          return [['value', 'DESC'], ['createdAt', 'DESC']];
        case 'value_asc':
          return [['value', 'ASC'], ['createdAt', 'ASC']];
        case 'created_desc':
          return [['createdAt', 'DESC']];
        case 'created_asc':
          return [['createdAt', 'ASC']];
        default:
          // Default: updatedAt DESC (mais recente primeiro)
          return [['updatedAt', 'DESC']];
      }
    };

    // Apply dynamic sorting
    // Se o usuário escolheu uma ordenação específica (não padrão), usar ela como prioridade
    // Caso contrário, manter position como ordenação primária
    const dynamicOrder = getSortOrder(sortBy);

    // Construir ordem para o Sequelize (sintaxe de nested order)
    let orderConfig;

    if (sortBy && sortBy !== 'updated_desc') {
      // Usuário escolheu ordenação específica - ela tem prioridade
      // Formato: [{ model: Lead, as: 'leads' }, 'campo', 'ASC/DESC']
      // Para ordenação por atividade, o dynamicOrder já vem com literal() - tratamento especial
      if (sortBy === 'activity_asc' || sortBy === 'activity_desc') {
        // Para atividades com subquery, usar formato especial sem nested model
        // O Sequelize precisa do literal() no nível superior do order array
        const subqueryLiteral = dynamicOrder[0][0]; // Pega o literal()
        const direction = sortBy === 'activity_asc' ? 'ASC' : 'DESC';

        orderConfig = [
          ['position', 'ASC'], // Ordenar colunas primeiro
          [subqueryLiteral, direction + ' NULLS LAST'] // Literal direto com direção
        ];
      } else {
        orderConfig = [
          ['position', 'ASC'], // Ordenar colunas primeiro
          ...dynamicOrder.map(([field, dir]) => [{ model: Lead, as: 'leads' }, field, dir])
        ];
      }
      console.log('🔄 Backend - Aplicando ordenação personalizada:', sortBy);
    } else {
      // Ordenação padrão - manter position primeiro nos leads
      orderConfig = [
        ['position', 'ASC'], // Ordenar colunas
        [{ model: Lead, as: 'leads' }, 'position', 'ASC'], // Ordenar leads por position
        ...dynamicOrder.map(([field, dir]) => [{ model: Lead, as: 'leads' }, field, dir])
      ];
      console.log('🔄 Backend - Aplicando ordenação padrão por position');
    }

    let columns;
    try {
      columns = await KanbanColumn.findAll({
        where: {
          account_id: req.account.id,
          is_active: true
        },
        include: [leadInclude],
        order: orderConfig
      });
    } catch (error) {
      console.error('❌ Erro ao buscar colunas com ordenação:', {
        sortBy,
        error: error.message,
        sql: error.sql || 'N/A'
      });
      throw error;
    }

    const processedColumns = processSequelizeResponse(columns);

    // Log do resultado da query
    const totalLeadsFound = processedColumns.reduce((sum, col) => sum + (col.leads?.length || 0), 0);
    console.log('🔍 Resultado da query:', {
      totalColumns: processedColumns.length,
      totalLeadsFound,
      firstLeadInFirstColumn: processedColumns[0]?.leads?.[0]?.name || 'N/A',
      searchApplied: search || 'NONE'
    });

    // Log de debug para verificar ordenação
    const firstColumnWithLeads = processedColumns.find(col => col.leads && col.leads.length > 0);
    if (firstColumnWithLeads) {
      console.log('🔄 Backend - Primeiro lead após ordenação:', {
        sortBy,
        firstLeadName: firstColumnWithLeads.leads[0].name,
        totalLeads: firstColumnWithLeads.leads.length,
        first3Leads: firstColumnWithLeads.leads.slice(0, 3).map(l => l.name)
      });
    }

    res.json({
      board: {
        columns: processedColumns,
        account: {
          id: req.account.id,
          name: req.account.name
        }
      }
    });
  })
};

module.exports = kanbanController;
