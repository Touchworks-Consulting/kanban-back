const { LeadActivity, Lead, User, Notification } = require('../models');
const { Op } = require('sequelize');

class ActivityNotificationService {
  constructor() {
    this.io = null; // Será definido quando o servidor inicializar
  }

  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Verificar e enviar notificações para atividades vencidas
   */
  async notifyOverdueActivities() {
    try {
      const now = new Date();

      // Buscar atividades vencidas que ainda não foram notificadas
      const overdueActivities = await LeadActivity.findAll({
        where: {
          status: 'pending',
          scheduled_for: {
            [Op.lt]: now
          },
          is_overdue: true,
          // Evitar spam - só notificar uma vez por dia
          updated_at: {
            [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        },
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'name', 'phone', 'email']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['scheduled_for', 'ASC']]
      });

      console.log(`📋 Encontradas ${overdueActivities.length} atividades vencidas para notificar`);

      // Agrupar por usuário para evitar spam
      const activitiesByUser = this.groupActivitiesByUser(overdueActivities);

      for (const [userId, activities] of activitiesByUser.entries()) {
        await this.sendOverdueNotification(userId, activities);
      }

      return {
        processed: overdueActivities.length,
        users_notified: activitiesByUser.size
      };

    } catch (error) {
      console.error('Erro ao notificar atividades vencidas:', error);
      throw error;
    }
  }

  /**
   * Verificar e enviar notificações para atividades do dia
   */
  async notifyTodayActivities() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Buscar atividades de hoje
      const todayActivities = await LeadActivity.findAll({
        where: {
          status: 'pending',
          scheduled_for: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay
          }
        },
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'name', 'phone', 'email']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['scheduled_for', 'ASC']]
      });

      console.log(`📅 Encontradas ${todayActivities.length} atividades para hoje`);

      // Agrupar por usuário
      const activitiesByUser = this.groupActivitiesByUser(todayActivities);

      for (const [userId, activities] of activitiesByUser.entries()) {
        await this.sendTodayNotification(userId, activities);
      }

      return {
        processed: todayActivities.length,
        users_notified: activitiesByUser.size
      };

    } catch (error) {
      console.error('Erro ao notificar atividades de hoje:', error);
      throw error;
    }
  }

  /**
   * Verificar lembretes de atividades
   */
  async checkReminders() {
    try {
      const now = new Date();
      const next5Minutes = new Date(now.getTime() + 5 * 60 * 1000); // Próximos 5 minutos

      // Buscar atividades com lembrete para os próximos 5 minutos
      const reminders = await LeadActivity.findAll({
        where: {
          status: 'pending',
          reminder_at: {
            [Op.gte]: now,
            [Op.lte]: next5Minutes
          }
        },
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'name', 'phone', 'email']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      console.log(`⏰ Encontrados ${reminders.length} lembretes para enviar`);

      for (const activity of reminders) {
        await this.sendReminderNotification(activity);
      }

      return {
        processed: reminders.length
      };

    } catch (error) {
      console.error('Erro ao verificar lembretes:', error);
      throw error;
    }
  }

  /**
   * Agrupar atividades por usuário
   */
  groupActivitiesByUser(activities) {
    const activitiesByUser = new Map();

    activities.forEach(activity => {
      const userId = activity.user_id;
      if (!activitiesByUser.has(userId)) {
        activitiesByUser.set(userId, []);
      }
      activitiesByUser.get(userId).push(activity);
    });

    return activitiesByUser;
  }

  /**
   * Enviar notificação de atividades vencidas
   */
  async sendOverdueNotification(userId, activities) {
    try {
      const user = activities[0].user;
      const accountId = activities[0].account_id;
      const count = activities.length;

      const notification = await Notification.create({
        account_id: accountId,
        user_id: userId,
        type: 'warning',
        title: `${count} atividade${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''}`,
        message: count === 1
          ? `A atividade "${activities[0].title}" está vencida desde ${this.formatDate(activities[0].scheduled_for)}`
          : `Você tem ${count} atividades vencidas. A mais antiga é "${activities[0].title}"`,
        action_url: `/leads/${activities[0].lead_id}?tab=tasks`,
        action_label: 'Ver Atividades',
        priority: 'high',
        metadata: {
          type: 'overdue_activities',
          activity_ids: activities.map(a => a.id),
          lead_ids: [...new Set(activities.map(a => a.lead_id))]
        }
      });

      // Enviar via Socket.IO se disponível
      if (this.io) {
        this.io.to(`account-${accountId}`).emit('new-notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          action_url: notification.action_url,
          action_label: notification.action_label,
          priority: notification.priority,
          timestamp: notification.created_at,
          read: false
        });
      }

      console.log(`🔔 Notificação de atividades vencidas enviada para ${user?.name} (${count} atividades)`);

    } catch (error) {
      console.error('Erro ao enviar notificação de atividades vencidas:', error);
    }
  }

  /**
   * Enviar notificação de atividades do dia
   */
  async sendTodayNotification(userId, activities) {
    try {
      const user = activities[0].user;
      const accountId = activities[0].account_id;
      const count = activities.length;

      // Só enviar no início do dia (8-10h) para não incomodar
      const now = new Date();
      const hour = now.getHours();
      if (hour < 8 || hour > 10) return;

      const notification = await Notification.create({
        account_id: accountId,
        user_id: userId,
        type: 'info',
        title: `${count} atividade${count > 1 ? 's' : ''} para hoje`,
        message: count === 1
          ? `Você tem a atividade "${activities[0].title}" agendada para hoje`
          : `Você tem ${count} atividades agendadas para hoje. A primeira é "${activities[0].title}"`,
        action_url: `/leads/${activities[0].lead_id}?tab=tasks`,
        action_label: 'Ver Agenda',
        priority: 'normal',
        metadata: {
          type: 'today_activities',
          activity_ids: activities.map(a => a.id),
          lead_ids: [...new Set(activities.map(a => a.lead_id))]
        }
      });

      // Enviar via Socket.IO se disponível
      if (this.io) {
        this.io.to(`account-${accountId}`).emit('new-notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          action_url: notification.action_url,
          action_label: notification.action_label,
          priority: notification.priority,
          timestamp: notification.created_at,
          read: false
        });
      }

      console.log(`📅 Notificação de atividades do dia enviada para ${user?.name} (${count} atividades)`);

    } catch (error) {
      console.error('Erro ao enviar notificação de atividades do dia:', error);
    }
  }

  /**
   * Enviar lembrete de atividade
   */
  async sendReminderNotification(activity) {
    try {
      const user = activity.user;
      const lead = activity.lead;
      const accountId = activity.account_id;

      const timeUntil = this.getTimeUntilScheduled(activity.scheduled_for);

      const notification = await Notification.create({
        account_id: accountId,
        user_id: activity.user_id,
        type: 'warning',
        title: '⏰ Lembrete de Atividade',
        message: `"${activity.title}" para ${lead?.name} ${timeUntil}`,
        action_url: `/leads/${activity.lead_id}?tab=tasks`,
        action_label: 'Ver Atividade',
        priority: 'high',
        metadata: {
          type: 'activity_reminder',
          activity_id: activity.id,
          lead_id: activity.lead_id
        }
      });

      // Enviar via Socket.IO se disponível
      if (this.io) {
        this.io.to(`account-${accountId}`).emit('new-notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          action_url: notification.action_url,
          action_label: notification.action_label,
          priority: notification.priority,
          timestamp: notification.created_at,
          read: false
        });
      }

      console.log(`⏰ Lembrete enviado para ${user?.name}: ${activity.title}`);

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
    }
  }

  /**
   * Formatar data para exibição
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calcular tempo até a atividade agendada
   */
  getTimeUntilScheduled(scheduledFor) {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diffMinutes = Math.floor((scheduled - now) / (1000 * 60));

    if (diffMinutes < 0) {
      return 'já deveria ter acontecido';
    } else if (diffMinutes < 60) {
      return `em ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffMinutes < 1440) { // menos de 1 dia
      const hours = Math.floor(diffMinutes / 60);
      return `em ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `em ${days} dia${days !== 1 ? 's' : ''}`;
    }
  }
}

module.exports = new ActivityNotificationService();