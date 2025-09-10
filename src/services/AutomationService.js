const { Automation, AutomationExecution, Lead, KanbanColumn, Tag } = require('../models');
const { Op } = require('sequelize');

class AutomationService {
  /**
   * Disparar automações baseadas em evento
   */
  async triggerAutomations(triggerType, triggerData, accountId) {
    try {
      // Buscar automações ativas para este trigger
      const automations = await Automation.findAll({
        where: {
          account_id: accountId,
          trigger_type: triggerType,
          is_active: true
        },
        order: [['priority', 'DESC'], ['created_at', 'ASC']]
      });

      console.log(`🔄 Verificando ${automations.length} automações para trigger: ${triggerType}`);

      for (const automation of automations) {
        // Verificar se condições são atendidas
        if (await this.checkConditions(automation, triggerData)) {
          await this.scheduleAutomationExecution(automation, triggerData);
        }
      }
    } catch (error) {
      console.error('Erro ao disparar automações:', error);
    }
  }

  /**
   * Verificar se condições da automação são atendidas
   */
  async checkConditions(automation, triggerData) {
    const conditions = automation.trigger_conditions || {};
    
    // Se não há condições, sempre executa
    if (Object.keys(conditions).length === 0) {
      return true;
    }

    // Verificar condições específicas baseadas no trigger
    switch (automation.trigger_type) {
      case 'lead_created':
        return this.checkLeadCreatedConditions(conditions, triggerData);
      
      case 'status_changed':
        return this.checkStatusChangedConditions(conditions, triggerData);
      
      case 'column_moved':
        return this.checkColumnMovedConditions(conditions, triggerData);
      
      case 'tag_added':
        return this.checkTagAddedConditions(conditions, triggerData);
      
      default:
        return true;
    }
  }

  /**
   * Verificar condições para lead criado
   */
  checkLeadCreatedConditions(conditions, triggerData) {
    const lead = triggerData.lead;
    
    // Verificar plataforma
    if (conditions.platform && lead.platform !== conditions.platform) {
      return false;
    }
    
    // Verificar campanha
    if (conditions.campaign && lead.campaign !== conditions.campaign) {
      return false;
    }
    
    // Verificar se tem email
    if (conditions.has_email && !lead.email) {
      return false;
    }
    
    // Verificar se tem telefone
    if (conditions.has_phone && !lead.phone) {
      return false;
    }
    
    return true;
  }

  /**
   * Verificar condições para mudança de status
   */
  checkStatusChangedConditions(conditions, triggerData) {
    const { previousStatus, newStatus } = triggerData;
    
    // Verificar status anterior
    if (conditions.from_status && previousStatus !== conditions.from_status) {
      return false;
    }
    
    // Verificar novo status
    if (conditions.to_status && newStatus !== conditions.to_status) {
      return false;
    }
    
    return true;
  }

  /**
   * Verificar condições para movimento de coluna
   */
  checkColumnMovedConditions(conditions, triggerData) {
    const { previousColumnId, newColumnId } = triggerData;
    
    if (conditions.from_column && previousColumnId !== conditions.from_column) {
      return false;
    }
    
    if (conditions.to_column && newColumnId !== conditions.to_column) {
      return false;
    }
    
    return true;
  }

  /**
   * Verificar condições para tag adicionada
   */
  checkTagAddedConditions(conditions, triggerData) {
    const { tagId } = triggerData;
    
    if (conditions.tag_id && tagId !== conditions.tag_id) {
      return false;
    }
    
    return true;
  }

  /**
   * Agendar execução de automação
   */
  async scheduleAutomationExecution(automation, triggerData) {
    try {
      const scheduledFor = new Date();
      
      // Aplicar atraso se configurado
      if (automation.delay_minutes > 0) {
        scheduledFor.setMinutes(scheduledFor.getMinutes() + automation.delay_minutes);
      }

      // Criar execução agendada
      const execution = await AutomationExecution.create({
        automation_id: automation.id,
        lead_id: triggerData.lead?.id || null,
        trigger_data: triggerData,
        scheduled_for: scheduledFor,
        status: 'pending',
        actions_total: automation.actions.length
      });

      console.log(`📋 Automação agendada: ${automation.name} (ID: ${execution.id})`);

      // Se não há atraso, executar imediatamente
      if (automation.delay_minutes === 0) {
        await this.executeAutomation(execution.id);
      }

      // Atualizar contador de execuções
      await automation.update({
        execution_count: automation.execution_count + 1,
        last_executed_at: new Date()
      });

    } catch (error) {
      console.error('Erro ao agendar automação:', error);
    }
  }

  /**
   * Executar automação
   */
  async executeAutomation(executionId) {
    let execution = null;
    
    try {
      execution = await AutomationExecution.findByPk(executionId, {
        include: [
          { model: Automation, as: 'automation' },
          { model: Lead, as: 'lead' }
        ]
      });

      if (!execution || execution.status !== 'pending') {
        return;
      }

      // Marcar como executando
      await execution.update({
        status: 'running',
        executed_at: new Date()
      });

      const automation = execution.automation;
      const actions = automation.actions || [];
      let completedActions = 0;
      const results = [];

      console.log(`🚀 Executando automação: ${automation.name}`);

      // Executar cada ação
      for (const action of actions) {
        try {
          const result = await this.executeAction(action, execution);
          results.push(result);
          completedActions++;
          
          await execution.update({ actions_completed: completedActions });
        } catch (actionError) {
          console.error(`Erro na ação ${action.type}:`, actionError);
          results.push({ error: actionError.message });
        }
      }

      // Finalizar execução
      await execution.update({
        status: 'completed',
        actions_completed: completedActions,
        execution_result: { actions: results }
      });

      console.log(`✅ Automação concluída: ${automation.name} (${completedActions}/${actions.length} ações)`);

    } catch (error) {
      console.error('Erro na execução da automação:', error);
      
      if (execution) {
        await execution.update({
          status: 'failed',
          error_message: error.message
        });
      }
    }
  }

  /**
   * Executar ação específica
   */
  async executeAction(action, execution) {
    switch (action.type) {
      case 'update_lead_status':
        return await this.actionUpdateLeadStatus(action, execution);
      
      case 'move_lead_column':
        return await this.actionMoveLeadColumn(action, execution);
      
      case 'add_tag':
        return await this.actionAddTag(action, execution);
      
      case 'remove_tag':
        return await this.actionRemoveTag(action, execution);
      
      case 'update_lead_field':
        return await this.actionUpdateLeadField(action, execution);
      
      case 'send_notification':
        return await this.actionSendNotification(action, execution);
      
      default:
        throw new Error(`Tipo de ação não implementado: ${action.type}`);
    }
  }

  /**
   * Ação: Atualizar status do lead
   */
  async actionUpdateLeadStatus(action, execution) {
    if (!execution.lead) {
      throw new Error('Lead não encontrado para atualizar status');
    }

    const previousStatus = execution.lead.status;
    await execution.lead.update({ status: action.value });

    return {
      type: 'update_lead_status',
      success: true,
      data: { previousStatus, newStatus: action.value }
    };
  }

  /**
   * Ação: Mover lead para outra coluna
   */
  async actionMoveLeadColumn(action, execution) {
    if (!execution.lead) {
      throw new Error('Lead não encontrado para mover coluna');
    }

    const previousColumnId = execution.lead.column_id;
    await execution.lead.update({ column_id: action.value });

    return {
      type: 'move_lead_column',
      success: true,
      data: { previousColumnId, newColumnId: action.value }
    };
  }

  /**
   * Ação: Adicionar tag
   */
  async actionAddTag(action, execution) {
    if (!execution.lead) {
      throw new Error('Lead não encontrado para adicionar tag');
    }

    // Verificar se tag existe
    const tag = await Tag.findOne({
      where: {
        id: action.value,
        account_id: execution.automation.account_id
      }
    });

    if (!tag) {
      throw new Error('Tag não encontrada');
    }

    // Adicionar tag ao lead
    await execution.lead.addTag(tag);

    return {
      type: 'add_tag',
      success: true,
      data: { tagId: action.value, tagName: tag.name }
    };
  }

  /**
   * Ação: Remover tag
   */
  async actionRemoveTag(action, execution) {
    if (!execution.lead) {
      throw new Error('Lead não encontrado para remover tag');
    }

    const tag = await Tag.findByPk(action.value);
    if (tag) {
      await execution.lead.removeTag(tag);
    }

    return {
      type: 'remove_tag',
      success: true,
      data: { tagId: action.value }
    };
  }

  /**
   * Ação: Atualizar campo do lead
   */
  async actionUpdateLeadField(action, execution) {
    if (!execution.lead) {
      throw new Error('Lead não encontrado para atualizar campo');
    }

    const updateData = {};
    updateData[action.field] = action.value;
    
    await execution.lead.update(updateData);

    return {
      type: 'update_lead_field',
      success: true,
      data: { field: action.field, value: action.value }
    };
  }

  /**
   * Ação: Enviar notificação
   */
  async actionSendNotification(action, execution) {
    // Implementar envio de notificação
    // Por ora, apenas simular
    
    console.log(`📧 Notificação enviada: ${action.message}`);

    return {
      type: 'send_notification',
      success: true,
      data: { message: action.message, recipient: action.recipient }
    };
  }

  /**
   * Processar automações agendadas
   */
  async processScheduledAutomations() {
    try {
      const now = new Date();
      
      const pendingExecutions = await AutomationExecution.findAll({
        where: {
          status: 'pending',
          scheduled_for: { [Op.lte]: now }
        },
        limit: 50 // Processar em lotes
      });

      console.log(`🔄 Processando ${pendingExecutions.length} automações agendadas`);

      for (const execution of pendingExecutions) {
        await this.executeAutomation(execution.id);
      }
    } catch (error) {
      console.error('Erro ao processar automações agendadas:', error);
    }
  }
}

module.exports = new AutomationService();
