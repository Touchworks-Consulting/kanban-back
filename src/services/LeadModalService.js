const { Lead, LeadActivity, LeadContact, LeadFile, User, Account } = require('../models');
const { Op } = require('sequelize');

/**
 * Service Layer for Lead Modal Operations
 * Implements optimized queries to avoid N+1 problems identified by code review
 */
class LeadModalService {
  /**
   * Get complete lead modal data in a single optimized query
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @returns {Promise<Object>} Complete lead data with related entities
   */
  static async getLeadModalData(leadId, accountId) {
    try {
      // Single optimized query with all relationships
      const lead = await Lead.findOne({
        where: {
          id: leadId,
          account_id: accountId
        },
        include: [
          {
            model: LeadActivity,
            as: 'activities',
            limit: 50, // Lazy loading - first 50 activities
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }]
          },
          {
            model: LeadContact,
            as: 'contacts',
            where: { is_active: true },
            required: false,
            order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
          },
          {
            model: LeadFile,
            as: 'files',
            include: [{
              model: User,
              as: 'uploadedBy',
              attributes: ['id', 'name']
            }],
            order: [['created_at', 'DESC']]
          },
          {
            model: User,
            as: 'assignedTo',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!lead) {
        throw new Error('Lead não encontrado');
      }

      return {
        lead,
        timeline: lead.activities || [],
        contacts: lead.contacts || [],
        files: lead.files || [],
        assignedUser: lead.assignedTo
      };
    } catch (error) {
      console.error('Error in LeadModalService.getLeadModalData:', error);
      throw error;
    }
  }

  /**
   * Get paginated timeline with optimized query
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise<Object>} Paginated timeline data
   */
  static async getTimelinePaginated(leadId, accountId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: activities } = await LeadActivity.findAndCountAll({
        where: {
          lead_id: leadId,
          account_id: accountId
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return {
        activities,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error in LeadModalService.getTimelinePaginated:', error);
      throw error;
    }
  }

  /**
   * Add activity with automatic logging
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @param {string} userId - User UUID
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity
   */
  static async addActivity(leadId, accountId, userId, activityData) {
    try {
      const activity = await LeadActivity.create({
        lead_id: leadId,
        account_id: accountId,
        user_id: userId,
        activity_type: activityData.type,
        title: activityData.title,
        description: activityData.description,
        metadata: activityData.metadata || {}
      });

      // Return activity with user data
      return await LeadActivity.findByPk(activity.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }]
      });
    } catch (error) {
      console.error('Error in LeadModalService.addActivity:', error);
      throw error;
    }
  }

  /**
   * Get lead contacts optimized
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @returns {Promise<Array>} Lead contacts
   */
  static async getContacts(leadId, accountId) {
    try {
      return await LeadContact.findAll({
        where: {
          lead_id: leadId,
          account_id: accountId,
          is_active: true
        },
        order: [
          ['is_primary', 'DESC'],
          ['type', 'ASC'],
          ['created_at', 'ASC']
        ]
      });
    } catch (error) {
      console.error('Error in LeadModalService.getContacts:', error);
      throw error;
    }
  }

  /**
   * Add contact with validation
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} Created contact
   */
  static async addContact(leadId, accountId, contactData) {
    try {
      // Validate contact data
      if (!contactData.type || !contactData.value) {
        throw new Error('Tipo e valor do contato são obrigatórios');
      }

      // Check for duplicates
      const existingContact = await LeadContact.findOne({
        where: {
          lead_id: leadId,
          type: contactData.type,
          value: contactData.value,
          is_active: true
        }
      });

      if (existingContact) {
        throw new Error('Este contato já existe para este lead');
      }

      const contact = await LeadContact.create({
        lead_id: leadId,
        account_id: accountId,
        type: contactData.type,
        label: contactData.label || 'primary',
        value: contactData.value,
        is_primary: contactData.is_primary || false
      });

      // Log activity
      await this.addActivity(leadId, accountId, null, {
        type: 'contact_added',
        title: `Contato ${contactData.type} adicionado`,
        description: `${contactData.type}: ${contactData.value}`,
        metadata: { contact_id: contact.id }
      });

      return contact;
    } catch (error) {
      console.error('Error in LeadModalService.addContact:', error);
      throw error;
    }
  }

  /**
   * Get lead files optimized
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @returns {Promise<Array>} Lead files
   */
  static async getFiles(leadId, accountId) {
    try {
      return await LeadFile.findAll({
        where: {
          lead_id: leadId,
          account_id: accountId
        },
        include: [{
          model: User,
          as: 'uploadedBy',
          attributes: ['id', 'name']
        }],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error in LeadModalService.getFiles:', error);
      throw error;
    }
  }

  /**
   * Add file with security validation
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @param {string} userId - User UUID
   * @param {Object} fileData - File data
   * @returns {Promise<Object>} Created file record
   */
  static async addFile(leadId, accountId, userId, fileData) {
    try {
      // Security validation will be done in controller
      const file = await LeadFile.create({
        lead_id: leadId,
        account_id: accountId,
        uploaded_by_user_id: userId,
        ...fileData
      });

      // Log activity
      await this.addActivity(leadId, accountId, userId, {
        type: 'file_uploaded',
        title: `Arquivo enviado: ${fileData.original_filename}`,
        description: fileData.description || null,
        metadata: {
          file_id: file.id,
          file_size: fileData.file_size,
          mime_type: fileData.mime_type
        }
      });

      // Return file with uploader data
      return await LeadFile.findByPk(file.id, {
        include: [{
          model: User,
          as: 'uploadedBy',
          attributes: ['id', 'name']
        }]
      });
    } catch (error) {
      console.error('Error in LeadModalService.addFile:', error);
      throw error;
    }
  }

  /**
   * Update lead with activity logging
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @param {string} userId - User UUID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated lead
   */
  static async updateLead(leadId, accountId, userId, updateData) {
    try {
      const lead = await Lead.findOne({
        where: { id: leadId, account_id: accountId }
      });

      if (!lead) {
        throw new Error('Lead não encontrado');
      }

      // Track status changes for activity log
      const oldStatus = lead.status;

      await lead.update(updateData);

      // Log status change activity
      if (updateData.status && updateData.status !== oldStatus) {
        await this.addActivity(leadId, accountId, userId, {
          type: 'status_change',
          title: `Status alterado para ${updateData.status}`,
          description: `Status anterior: ${oldStatus}`,
          metadata: {
            old_status: oldStatus,
            new_status: updateData.status
          }
        });
      }

      // Log general update activity
      if (Object.keys(updateData).length > 0 && !updateData.status) {
        await this.addActivity(leadId, accountId, userId, {
          type: 'lead_updated',
          title: 'Lead atualizado',
          description: `Campos alterados: ${Object.keys(updateData).join(', ')}`,
          metadata: { updated_fields: Object.keys(updateData) }
        });
      }

      return lead;
    } catch (error) {
      console.error('Error in LeadModalService.updateLead:', error);
      throw error;
    }
  }

  /**
   * Get lead summary stats for performance metrics
   * @param {string} leadId - Lead UUID
   * @param {string} accountId - Account UUID
   * @returns {Promise<Object>} Lead summary stats
   */
  static async getLeadStats(leadId, accountId) {
    try {
      const [
        activitiesCount,
        contactsCount,
        filesCount,
        lastActivity
      ] = await Promise.all([
        LeadActivity.count({ where: { lead_id: leadId, account_id: accountId } }),
        LeadContact.count({ where: { lead_id: leadId, account_id: accountId, is_active: true } }),
        LeadFile.count({ where: { lead_id: leadId, account_id: accountId } }),
        LeadActivity.findOne({
          where: { lead_id: leadId, account_id: accountId },
          order: [['created_at', 'DESC']],
          attributes: ['created_at', 'activity_type', 'title']
        })
      ]);

      return {
        activitiesCount,
        contactsCount,
        filesCount,
        lastActivity: lastActivity ? {
          date: lastActivity.created_at,
          type: lastActivity.activity_type,
          title: lastActivity.title
        } : null
      };
    } catch (error) {
      console.error('Error in LeadModalService.getLeadStats:', error);
      throw error;
    }
  }
}

module.exports = LeadModalService;