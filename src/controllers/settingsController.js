const { Account, User, Lead, Campaign, WhatsAppAccount, WebhookLog, Notification } = require('../models');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');
const cacheService = require('../services/CacheService');

const settingsController = {
  // Profile Settings
  async getProfile(req, res) {
    try {
      const account = await Account.findByPk(req.account.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const profile = {
        name: account.name,
        email: account.email,
        display_name: account.display_name,
        description: account.description,
        avatar_url: account.avatar_url,
        plan: account.plan,
        settings: account.settings || {}
      };

      res.json(profile);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  },

  async updateProfile(req, res) {
    try {
      const { name, email, display_name, description, avatar_url } = req.body;

      const account = await Account.findByPk(req.account.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      await account.update({
        name: name || account.name,
        email: email || account.email,
        display_name: display_name || account.display_name,
        description: description || account.description,
        avatar_url: avatar_url || account.avatar_url
      });

      res.json({
        message: 'Profile updated successfully',
        profile: {
          name: account.name,
          email: account.email,
          display_name: account.display_name,
          description: account.description,
          avatar_url: account.avatar_url,
          plan: account.plan
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  // System Statistics
  async getSystemStatistics(req, res) {
    try {
      const accountId = req.account.id;

      // Get counts in parallel
      const [
        totalLeads,
        totalCampaigns,
        totalWebhooks,
        totalWhatsAppAccounts,
        leadsThisMonth,
        wonLeads,
        lostLeads,
        activeLeads
      ] = await Promise.all([
        Lead.count({ where: { account_id: accountId } }),
        Campaign.count({ where: { account_id: accountId } }),
        WebhookLog.count({ where: { account_id: accountId } }),
        WhatsAppAccount.count({ where: { account_id: accountId } }),
        Lead.count({
          where: {
            account_id: accountId,
            createdAt: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        Lead.count({
          where: {
            account_id: accountId,
            status: 'won'
          }
        }),
        Lead.count({
          where: {
            account_id: accountId,
            status: 'lost'
          }
        }),
        Lead.count({
          where: {
            account_id: accountId,
            status: { [Op.notIn]: ['won', 'lost'] }
          }
        })
      ]);

      // Calculate conversion rate
      const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

      const statistics = {
        overview: {
          totalLeads,
          totalCampaigns,
          totalWebhooks,
          totalWhatsAppAccounts
        },
        performance: {
          leadsThisMonth,
          wonLeads,
          lostLeads,
          activeLeads,
          conversionRate: parseFloat(conversionRate)
        },
        lastUpdated: new Date().toISOString()
      };

      res.json(statistics);
    } catch (error) {
      console.error('Error getting system statistics:', error);
      res.status(500).json({ error: 'Failed to get system statistics' });
    }
  },

  // Data Export
  async exportLeads(req, res) {
    try {
      const accountId = req.account.id;
      const { format = 'csv', status, dateFrom, dateTo } = req.query;

      let whereClause = { account_id: accountId };

      if (status) {
        whereClause.status = status;
      }

      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
      }

      const leads = await Lead.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.json"`);
        return res.json(leads);
      }

      // CSV Export
      const fields = [
        'id', 'name', 'email', 'phone', 'platform', 'channel',
        'campaign', 'status', 'value', 'won_reason', 'lost_reason',
        'createdAt', 'updatedAt'
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(leads);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ error: 'Failed to export leads' });
    }
  },

  async exportCampaigns(req, res) {
    try {
      const accountId = req.account.id;

      const campaigns = await Campaign.findAll({
        where: { account_id: accountId },
        order: [['createdAt', 'DESC']]
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="campaigns-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(campaigns);
    } catch (error) {
      console.error('Error exporting campaigns:', error);
      res.status(500).json({ error: 'Failed to export campaigns' });
    }
  },

  async exportWebhookLogs(req, res) {
    try {
      const accountId = req.account.id;
      const { dateFrom, dateTo } = req.query;

      let whereClause = { account_id: accountId };

      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
      }

      const logs = await WebhookLog.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: 10000 // Limit to prevent memory issues
      });

      const fields = [
        'id', 'phone_id', 'event_type', 'status_code',
        'response_body', 'error_message', 'createdAt'
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="webhook-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting webhook logs:', error);
      res.status(500).json({ error: 'Failed to export webhook logs' });
    }
  },

  // Notification Settings
  async getNotificationSettings(req, res) {
    try {
      const account = await Account.findByPk(req.account.id);
      const settings = account.settings || {};

      const notificationSettings = {
        newLeads: settings.notifications?.newLeads ?? true,
        webhooks: settings.notifications?.webhooks ?? false,
        statusChanges: settings.notifications?.statusChanges ?? true,
        campaignUpdates: settings.notifications?.campaignUpdates ?? false,
        systemAlerts: settings.notifications?.systemAlerts ?? true
      };

      res.json(notificationSettings);
    } catch (error) {
      console.error('Error getting notification settings:', error);
      res.status(500).json({ error: 'Failed to get notification settings' });
    }
  },

  async updateNotificationSettings(req, res) {
    try {
      const { newLeads, webhooks, statusChanges, campaignUpdates, systemAlerts } = req.body;

      const account = await Account.findByPk(req.account.id);
      const settings = account.settings || {};

      settings.notifications = {
        newLeads: newLeads ?? settings.notifications?.newLeads ?? true,
        webhooks: webhooks ?? settings.notifications?.webhooks ?? false,
        statusChanges: statusChanges ?? settings.notifications?.statusChanges ?? true,
        campaignUpdates: campaignUpdates ?? settings.notifications?.campaignUpdates ?? false,
        systemAlerts: systemAlerts ?? settings.notifications?.systemAlerts ?? true
      };

      await account.update({ settings });

      res.json({
        message: 'Notification settings updated successfully',
        settings: settings.notifications
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  },

  // Notifications Management
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unread_only } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = { account_id: req.account.id };

      if (unread_only === 'true') {
        whereClause.is_read = false;
        whereClause.is_dismissed = false;
      }

      const notifications = await Notification.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        notifications: notifications.rows,
        pagination: {
          total: notifications.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(notifications.count / limit)
        }
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  },

  async markNotificationAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findOne({
        where: { id, account_id: req.account.id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await notification.update({ is_read: true });

      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },

  async dismissNotification(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findOne({
        where: { id, account_id: req.account.id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await notification.update({ is_dismissed: true });

      res.json({ message: 'Notification dismissed' });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      res.status(500).json({ error: 'Failed to dismiss notification' });
    }
  },

  // System Maintenance
  async cleanupOldLogs(req, res) {
    try {
      const { days = 30 } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      const deletedCount = await WebhookLog.destroy({
        where: {
          account_id: req.account.id,
          createdAt: { [Op.lt]: cutoffDate }
        }
      });

      res.json({
        message: `Cleanup completed. Removed ${deletedCount} old logs.`,
        deletedCount
      });
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      res.status(500).json({ error: 'Failed to cleanup logs' });
    }
  },

  // Custom Status Management
  async getCustomStatuses(req, res) {
    try {
      const accountId = req.account.id;

      // 📦 Tentar buscar do cache primeiro
      const cachedStatuses = await cacheService.getCustomStatusesCache(accountId);
      if (cachedStatuses) {
        console.log(`📦 Cache HIT: custom statuses para conta ${accountId}`);
        return res.json({ statuses: cachedStatuses });
      }

      // Cache MISS - buscar do banco
      console.log(`📦 Cache MISS: buscando custom statuses do banco para conta ${accountId}`);
      const account = await Account.findByPk(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const statuses = account.custom_statuses || [];

      // Armazenar no cache
      await cacheService.setCustomStatusesCache(accountId, statuses);

      res.json({ statuses });
    } catch (error) {
      console.error('Error getting custom statuses:', error);
      res.status(500).json({ error: 'Failed to get custom statuses' });
    }
  },

  async updateCustomStatuses(req, res) {
    try {
      const { statuses } = req.body;

      if (!Array.isArray(statuses)) {
        return res.status(400).json({ error: 'Statuses must be an array' });
      }

      // Validate each status
      for (const status of statuses) {
        if (!status.id || !status.name || !status.color || status.order === undefined) {
          return res.status(400).json({
            error: 'Each status must have id, name, color, and order'
          });
        }

        if (typeof status.is_initial !== 'boolean' ||
            typeof status.is_won !== 'boolean' ||
            typeof status.is_lost !== 'boolean') {
          return res.status(400).json({
            error: 'Each status must have boolean flags: is_initial, is_won, is_lost'
          });
        }
      }

      // Ensure there's exactly one initial status
      const initialStatuses = statuses.filter(s => s.is_initial);
      if (initialStatuses.length !== 1) {
        return res.status(400).json({
          error: 'There must be exactly one initial status'
        });
      }

      // Ensure no status is both won and lost
      const invalidStatuses = statuses.filter(s => s.is_won && s.is_lost);
      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          error: 'A status cannot be both won and lost'
        });
      }

      const account = await Account.findByPk(req.account.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      await account.update({ custom_statuses: statuses });

      // 🔄 Invalidar cache após atualização
      await cacheService.invalidateCustomStatusesCache(req.account.id);
      console.log(`📦 Cache INVALIDATED: custom statuses para conta ${req.account.id}`);

      res.json({
        message: 'Custom statuses updated successfully',
        statuses
      });
    } catch (error) {
      console.error('Error updating custom statuses:', error);
      res.status(500).json({ error: 'Failed to update custom statuses' });
    }
  },

  async getCustomLossReasons(req, res) {
    try {
      const accountId = req.account.id;

      // 📦 Tentar buscar do cache primeiro
      const cachedReasons = await cacheService.getLossReasonsCache(accountId);
      if (cachedReasons) {
        console.log(`📦 Cache HIT: loss reasons para conta ${accountId}`);
        return res.json({ lossReasons: cachedReasons });
      }

      // Cache MISS - buscar do banco
      console.log(`📦 Cache MISS: buscando loss reasons do banco para conta ${accountId}`);
      const account = await Account.findByPk(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const lossReasons = account.custom_loss_reasons || [];

      // Armazenar no cache
      await cacheService.setLossReasonsCache(accountId, lossReasons);

      res.json({ lossReasons });
    } catch (error) {
      console.error('Error getting custom loss reasons:', error);
      res.status(500).json({ error: 'Failed to get custom loss reasons' });
    }
  },

  async updateCustomLossReasons(req, res) {
    try {
      const { lossReasons } = req.body;

      if (!Array.isArray(lossReasons)) {
        return res.status(400).json({ error: 'Loss reasons must be an array' });
      }

      // Validate each loss reason
      for (const reason of lossReasons) {
        if (!reason.id || !reason.name || reason.order === undefined) {
          return res.status(400).json({
            error: 'Each loss reason must have id, name, and order'
          });
        }
      }

      const account = await Account.findByPk(req.account.id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      await account.update({ custom_loss_reasons: lossReasons });

      // 🔄 Invalidar cache após atualização
      await cacheService.invalidateLossReasonsCache(req.account.id);
      console.log(`📦 Cache INVALIDATED: loss reasons para conta ${req.account.id}`);

      res.json({
        message: 'Custom loss reasons updated successfully',
        lossReasons
      });
    } catch (error) {
      console.error('Error updating custom loss reasons:', error);
      res.status(500).json({ error: 'Failed to update custom loss reasons' });
    }
  }
};

module.exports = settingsController;