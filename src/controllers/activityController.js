const { LeadActivity, Lead, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { processSequelizeResponse } = require('../utils/dateSerializer');

const activityController = {
  // Get activities for a specific lead
  getLeadActivities: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const { status, type, priority, page = 1, limit = 20 } = req.query;

    // Verify lead belongs to account
    const lead = await Lead.findOne({
      where: { id: leadId, account_id: req.account.id }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    const whereClause = {
      lead_id: leadId,
      account_id: req.account.id
    };

    // Apply filters
    if (status) whereClause.status = status;
    if (type) whereClause.activity_type = type;
    if (priority) whereClause.priority = priority;

    const offset = (page - 1) * limit;

    const { count, rows: activities } = await LeadActivity.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      activities: activities.map(activity => processSequelizeResponse(activity)),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  }),

  // Create new activity
  createActivity: asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const {
      activity_type,
      title,
      description,
      scheduled_for,
      priority = 'medium',
      reminder_at,
      duration_minutes,
      status = 'pending'
    } = req.body;

    // Verify lead belongs to account
    const lead = await Lead.findOne({
      where: { id: leadId, account_id: req.account.id }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    // Create activity
    const activity = await LeadActivity.create({
      account_id: req.account.id,
      lead_id: leadId,
      user_id: req.user.id,
      activity_type,
      title,
      description,
      scheduled_for,
      priority,
      reminder_at,
      duration_minutes,
      status,
      is_overdue: false
    });

    // Fetch with user data
    const activityWithUser = await LeadActivity.findByPk(activity.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Atividade criada com sucesso',
      activity: processSequelizeResponse(activityWithUser)
    });
  }),

  // Update activity
  updateActivity: asyncHandler(async (req, res) => {
    const { activityId } = req.params;
    const {
      title,
      description,
      scheduled_for,
      priority,
      reminder_at,
      duration_minutes,
      status,
      completed_at
    } = req.body;

    const activity = await LeadActivity.findOne({
      where: {
        id: activityId,
        account_id: req.account.id
      }
    });

    if (!activity) {
      return res.status(404).json({
        error: 'Atividade não encontrada'
      });
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;
    if (priority !== undefined) updateData.priority = priority;
    if (reminder_at !== undefined) updateData.reminder_at = reminder_at;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed' && !completed_at) {
        updateData.completed_at = new Date();
      } else if (status !== 'completed') {
        updateData.completed_at = null;
      }
    }
    if (completed_at !== undefined) updateData.completed_at = completed_at;

    await activity.update(updateData);

    // Fetch updated activity with user data
    const updatedActivity = await LeadActivity.findByPk(activity.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Atividade atualizada com sucesso',
      activity: processSequelizeResponse(updatedActivity)
    });
  }),

  // Delete activity
  deleteActivity: asyncHandler(async (req, res) => {
    const { activityId } = req.params;

    const activity = await LeadActivity.findOne({
      where: {
        id: activityId,
        account_id: req.account.id
      }
    });

    if (!activity) {
      return res.status(404).json({
        error: 'Atividade não encontrada'
      });
    }

    await activity.destroy();

    res.json({
      success: true,
      message: 'Atividade excluída com sucesso'
    });
  }),

  // Get user's activities for today
  getTodayActivities: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // If no userId provided, use current user
    const targetUserId = userId || req.user.id;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const activities = await LeadActivity.findAll({
      where: {
        account_id: req.account.id,
        user_id: targetUserId,
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
          attributes: ['id', 'name', 'phone', 'email'],
          required: true
        }
      ],
      order: [['scheduled_for', 'ASC']]
    });

    res.json({
      success: true,
      activities: activities.map(activity => processSequelizeResponse(activity)),
      count: activities.length
    });
  }),

  // Get user's overdue activities
  getOverdueActivities: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // If no userId provided, use current user
    const targetUserId = userId || req.user.id;

    const now = new Date();

    const activities = await LeadActivity.findAll({
      where: {
        account_id: req.account.id,
        user_id: targetUserId,
        status: 'pending',
        scheduled_for: {
          [Op.lt]: now
        }
      },
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'name', 'phone', 'email'],
          required: true
        }
      ],
      order: [['scheduled_for', 'ASC']]
    });

    // Mark as overdue if not already
    const overdueIds = activities.map(a => a.id);
    if (overdueIds.length > 0) {
      await LeadActivity.update(
        { is_overdue: true },
        {
          where: {
            id: { [Op.in]: overdueIds },
            is_overdue: false
          }
        }
      );
    }

    res.json({
      success: true,
      activities: activities.map(activity => processSequelizeResponse(activity)),
      count: activities.length
    });
  }),

  // Get user's upcoming activities (next 7 days)
  getUpcomingActivities: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    // If no userId provided, use current user
    const targetUserId = userId || req.user.id;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const activities = await LeadActivity.findAll({
      where: {
        account_id: req.account.id,
        user_id: targetUserId,
        status: 'pending',
        scheduled_for: {
          [Op.gte]: now,
          [Op.lte]: futureDate
        }
      },
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'name', 'phone', 'email'],
          required: true
        }
      ],
      order: [['scheduled_for', 'ASC']]
    });

    res.json({
      success: true,
      activities: activities.map(activity => processSequelizeResponse(activity)),
      count: activities.length
    });
  }),

  // Get activity counts for user dashboard
  getActivityCounts: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // If no userId provided, use current user
    const targetUserId = userId || req.user.id;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [totalPending, todayCount, overdueCount] = await Promise.all([
      // Total pending activities
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          user_id: targetUserId,
          status: 'pending'
        }
      }),

      // Today's activities
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          user_id: targetUserId,
          status: 'pending',
          scheduled_for: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay
          }
        }
      }),

      // Overdue activities
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          user_id: targetUserId,
          status: 'pending',
          scheduled_for: {
            [Op.lt]: today
          }
        }
      })
    ]);

    res.json({
      success: true,
      counts: {
        total_pending: totalPending,
        today: todayCount,
        overdue: overdueCount
      }
    });
  }),

  // Bulk update activity status (for quick actions)
  bulkUpdateStatus: asyncHandler(async (req, res) => {
    const { activityIds, status, completed_at } = req.body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({
        error: 'IDs de atividades são obrigatórios'
      });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completed_at = completed_at || new Date();
    } else {
      updateData.completed_at = null;
    }

    const [updatedCount] = await LeadActivity.update(updateData, {
      where: {
        id: { [Op.in]: activityIds },
        account_id: req.account.id
      }
    });

    res.json({
      success: true,
      message: `${updatedCount} atividades atualizadas com sucesso`,
      updated_count: updatedCount
    });
  }),

  // Get activity counts for a specific lead (for lead card indicators)
  getLeadActivityCounts: asyncHandler(async (req, res) => {
    const { leadId } = req.params;

    // Verify lead belongs to account
    const lead = await Lead.findOne({
      where: { id: leadId, account_id: req.account.id }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado'
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [totalPending, todayCount, overdueCount] = await Promise.all([
      // Total pending activities for this lead
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          lead_id: leadId,
          status: 'pending'
        }
      }),

      // Today's activities for this lead
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          lead_id: leadId,
          status: 'pending',
          scheduled_for: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay
          }
        }
      }),

      // Overdue activities for this lead
      LeadActivity.count({
        where: {
          account_id: req.account.id,
          lead_id: leadId,
          status: 'pending',
          scheduled_for: {
            [Op.lt]: today
          }
        }
      })
    ]);

    res.json({
      success: true,
      lead_id: leadId,
      counts: {
        total_pending: totalPending,
        today: todayCount,
        overdue: overdueCount,
        has_tasks: totalPending > 0,
        has_overdue: overdueCount > 0,
        has_today: todayCount > 0
      }
    });
  }),

  // Get activity counts for multiple leads (bulk operation for kanban board)
  getBulkLeadActivityCounts: asyncHandler(async (req, res) => {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: 'IDs de leads são obrigatórios'
      });
    }

    // Verify all leads belong to account
    const leads = await Lead.findAll({
      where: {
        id: { [Op.in]: leadIds },
        account_id: req.account.id
      },
      attributes: ['id']
    });

    const validLeadIds = leads.map(lead => lead.id);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get counts for all leads at once with raw SQL for better performance
    const [pendingResults, todayResults, overdueResults] = await Promise.all([
      // Total pending by lead
      LeadActivity.findAll({
        attributes: [
          'lead_id',
          [LeadActivity.sequelize.fn('COUNT', LeadActivity.sequelize.col('id')), 'count']
        ],
        where: {
          account_id: req.account.id,
          lead_id: { [Op.in]: validLeadIds },
          status: 'pending'
        },
        group: ['lead_id'],
        raw: true
      }),

      // Today's activities by lead
      LeadActivity.findAll({
        attributes: [
          'lead_id',
          [LeadActivity.sequelize.fn('COUNT', LeadActivity.sequelize.col('id')), 'count']
        ],
        where: {
          account_id: req.account.id,
          lead_id: { [Op.in]: validLeadIds },
          status: 'pending',
          scheduled_for: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay
          }
        },
        group: ['lead_id'],
        raw: true
      }),

      // Overdue activities by lead
      LeadActivity.findAll({
        attributes: [
          'lead_id',
          [LeadActivity.sequelize.fn('COUNT', LeadActivity.sequelize.col('id')), 'count']
        ],
        where: {
          account_id: req.account.id,
          lead_id: { [Op.in]: validLeadIds },
          status: 'pending',
          scheduled_for: {
            [Op.lt]: today
          }
        },
        group: ['lead_id'],
        raw: true
      })
    ]);

    // Convert results to maps for easy lookup
    const pendingMap = new Map(pendingResults.map(r => [r.lead_id, parseInt(r.count)]));
    const todayMap = new Map(todayResults.map(r => [r.lead_id, parseInt(r.count)]));
    const overdueMap = new Map(overdueResults.map(r => [r.lead_id, parseInt(r.count)]));

    // Build response with counts for each lead
    const leadCounts = validLeadIds.map(leadId => {
      const totalPending = pendingMap.get(leadId) || 0;
      const todayCount = todayMap.get(leadId) || 0;
      const overdueCount = overdueMap.get(leadId) || 0;

      return {
        lead_id: leadId,
        counts: {
          total_pending: totalPending,
          today: todayCount,
          overdue: overdueCount,
          has_tasks: totalPending > 0,
          has_overdue: overdueCount > 0,
          has_today: todayCount > 0
        }
      };
    });

    res.json({
      success: true,
      lead_counts: leadCounts
    });
  }),

  // Mark overdue activities (to be called by cron job)
  markOverdueActivities: asyncHandler(async (req, res) => {
    const now = new Date();

    const [updatedCount] = await LeadActivity.update(
      { is_overdue: true },
      {
        where: {
          status: 'pending',
          scheduled_for: {
            [Op.lt]: now
          },
          is_overdue: false
        }
      }
    );

    res.json({
      success: true,
      message: `${updatedCount} atividades marcadas como vencidas`,
      updated_count: updatedCount,
      timestamp: now
    });
  })
};

module.exports = activityController;