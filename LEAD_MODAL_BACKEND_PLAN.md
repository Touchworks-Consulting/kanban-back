# 🔧 **Plano Backend: Modal de Lead Enterprise**

## 🎯 **Objetivo**
Implementar as APIs e modelos de dados necessários para suportar as funcionalidades avançadas do modal de lead enterprise.

## 📊 **Novos Modelos de Dados**

### **1. LeadActivity (Timeline)**
```javascript
// src/models/LeadActivity.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  user_id: UUID (FK -> User),
  account_id: UUID (FK -> Account),
  type: ENUM ['status_change', 'note_added', 'task_created', 'file_uploaded', 'contact_added', 'email_sent', 'call_made'],
  title: STRING,
  description: TEXT,
  metadata: JSONB, // Dados específicos da atividade
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **2. LeadContact (Múltiplos Contatos)**
```javascript
// src/models/LeadContact.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  account_id: UUID (FK -> Account),
  type: ENUM ['phone', 'email'],
  label: ENUM ['primary', 'secondary', 'work', 'personal', 'mobile', 'home'],
  value: STRING,
  is_primary: BOOLEAN,
  is_active: BOOLEAN,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **3. LeadTask (Tarefas e Follow-ups)**
```javascript
// src/models/LeadTask.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  assigned_to_user_id: UUID (FK -> User),
  created_by_user_id: UUID (FK -> User),
  account_id: UUID (FK -> Account),
  title: STRING,
  description: TEXT,
  type: ENUM ['call', 'email', 'meeting', 'follow_up', 'proposal', 'contract'],
  priority: ENUM ['low', 'medium', 'high', 'urgent'],
  status: ENUM ['pending', 'in_progress', 'completed', 'cancelled'],
  due_date: TIMESTAMP,
  completed_at: TIMESTAMP,
  reminder_at: TIMESTAMP,
  metadata: JSONB,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **4. LeadFile (Anexos e Documentos)**
```javascript
// src/models/LeadFile.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  uploaded_by_user_id: UUID (FK -> User),
  account_id: UUID (FK -> Account),
  filename: STRING,
  original_filename: STRING,
  file_path: STRING,
  file_size: INTEGER,
  mime_type: STRING,
  file_type: ENUM ['image', 'document', 'spreadsheet', 'presentation', 'pdf', 'other'],
  description: TEXT,
  tags: STRING[], // Array de tags para categorização
  is_public: BOOLEAN, // Se outros usuários da conta podem ver
  version: INTEGER, // Para versionamento de arquivos
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **5. CustomField (Campos Personalizados)**
```javascript
// src/models/CustomField.js
{
  id: UUID,
  account_id: UUID (FK -> Account),
  entity_type: ENUM ['lead'], // Futuro: 'contact', 'deal', etc.
  name: STRING,
  label: STRING,
  field_type: ENUM ['text', 'number', 'date', 'select', 'multiselect', 'boolean', 'textarea', 'url', 'email'],
  options: JSONB, // Para campos select/multiselect
  validation_rules: JSONB, // Regras de validação
  is_required: BOOLEAN,
  is_active: BOOLEAN,
  display_order: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **6. LeadCustomFieldValue (Valores dos Campos Personalizados)**
```javascript
// src/models/LeadCustomFieldValue.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  custom_field_id: UUID (FK -> CustomField),
  account_id: UUID (FK -> Account),
  value: TEXT, // Valor serializado como JSON se necessário
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **7. LeadScore (Score de Engajamento)**
```javascript
// src/models/LeadScore.js
{
  id: UUID,
  lead_id: UUID (FK -> Lead),
  account_id: UUID (FK -> Account),
  score: INTEGER, // 0-100
  last_activity_at: TIMESTAMP,
  engagement_level: ENUM ['cold', 'warm', 'hot', 'burning'],
  score_factors: JSONB, // Detalhes do que compõe o score
  calculated_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

## 🔄 **Migrações do Banco de Dados**

### **Migration 1: LeadActivity**
```javascript
// src/database/migrations/20241226-create-lead-activities.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lead_activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leads', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('status_change', 'note_added', 'task_created', 'file_uploaded', 'contact_added', 'email_sent', 'call_made'),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Índices para performance
    await queryInterface.addIndex('lead_activities', ['lead_id', 'created_at']);
    await queryInterface.addIndex('lead_activities', ['account_id']);
    await queryInterface.addIndex('lead_activities', ['type']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('lead_activities');
  }
};
```

### **Migration 2: LeadContact**
```javascript
// src/database/migrations/20241226-create-lead-contacts.js
// Similar structure for lead_contacts table
```

### **Migration 3-7: Demais Tabelas**
```javascript
// Migrations para lead_tasks, lead_files, custom_fields, lead_custom_field_values, lead_scores
```

## 🛠️ **Novos Controllers**

### **1. LeadActivityController**
```javascript
// src/controllers/leadActivityController.js
const { LeadActivity, User } = require('../models');

module.exports = {
  // GET /api/leads/:leadId/activities
  list: async (req, res) => {
    const { leadId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const activities = await LeadActivity.findAll({
      where: {
        lead_id: leadId,
        account_id: req.account.id
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({ success: true, activities });
  },

  // POST /api/leads/:leadId/activities
  create: async (req, res) => {
    const { leadId } = req.params;
    const { type, title, description, metadata } = req.body;

    const activity = await LeadActivity.create({
      lead_id: leadId,
      user_id: req.user.id,
      account_id: req.account.id,
      type,
      title,
      description,
      metadata
    });

    res.status(201).json({ success: true, activity });
  },

  // Helper function to log activities automatically
  logActivity: async (leadId, accountId, userId, type, title, description, metadata) => {
    return await LeadActivity.create({
      lead_id: leadId,
      user_id: userId,
      account_id: accountId,
      type,
      title,
      description,
      metadata
    });
  }
};
```

### **2. LeadTaskController**
```javascript
// src/controllers/leadTaskController.js
const { LeadTask, User, Lead } = require('../models');
const { leadActivityController } = require('./leadActivityController');

module.exports = {
  // GET /api/leads/:leadId/tasks
  list: async (req, res) => {
    const { leadId } = req.params;
    const { status, assigned_to } = req.query;

    const where = {
      lead_id: leadId,
      account_id: req.account.id
    };

    if (status) where.status = status;
    if (assigned_to) where.assigned_to_user_id = assigned_to;

    const tasks = await LeadTask.findAll({
      where,
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] }
      ],
      order: [['due_date', 'ASC'], ['priority', 'DESC']]
    });

    res.json({ success: true, tasks });
  },

  // POST /api/leads/:leadId/tasks
  create: async (req, res) => {
    const { leadId } = req.params;
    const { title, description, type, priority, due_date, assigned_to_user_id, reminder_at } = req.body;

    const task = await LeadTask.create({
      lead_id: leadId,
      assigned_to_user_id,
      created_by_user_id: req.user.id,
      account_id: req.account.id,
      title,
      description,
      type,
      priority,
      due_date,
      reminder_at,
      status: 'pending'
    });

    // Log activity
    await leadActivityController.logActivity(
      leadId,
      req.account.id,
      req.user.id,
      'task_created',
      `Tarefa criada: ${title}`,
      description,
      { task_id: task.id, type, priority }
    );

    res.status(201).json({ success: true, task });
  },

  // PUT /api/tasks/:taskId
  update: async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await LeadTask.findOne({
      where: { id: taskId, account_id: req.account.id }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
    }

    await task.update(updates);

    // Log activity if status changed
    if (updates.status && updates.status !== task.status) {
      await leadActivityController.logActivity(
        task.lead_id,
        req.account.id,
        req.user.id,
        'task_updated',
        `Tarefa ${updates.status}`,
        `${task.title} - Status alterado para ${updates.status}`,
        { task_id: task.id, old_status: task.status, new_status: updates.status }
      );
    }

    res.json({ success: true, task });
  }
};
```

### **3. LeadFileController**
```javascript
// src/controllers/leadFileController.js
const multer = require('multer');
const path = require('path');
const { LeadFile } = require('../models');
const { leadActivityController } = require('./leadActivityController');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/leads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept most common file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

module.exports = {
  upload,

  // POST /api/leads/:leadId/files
  uploadFile: async (req, res) => {
    const { leadId } = req.params;
    const { description, tags, is_public } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const leadFile = await LeadFile.create({
      lead_id: leadId,
      uploaded_by_user_id: req.user.id,
      account_id: req.account.id,
      filename: file.filename,
      original_filename: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      file_type: getFileType(file.mimetype),
      description,
      tags: tags ? tags.split(',') : [],
      is_public: is_public || false,
      version: 1
    });

    // Log activity
    await leadActivityController.logActivity(
      leadId,
      req.account.id,
      req.user.id,
      'file_uploaded',
      `Arquivo enviado: ${file.originalname}`,
      description,
      { file_id: leadFile.id, file_size: file.size, mime_type: file.mimetype }
    );

    res.status(201).json({ success: true, file: leadFile });
  },

  // GET /api/leads/:leadId/files
  list: async (req, res) => {
    const { leadId } = req.params;

    const files = await LeadFile.findAll({
      where: {
        lead_id: leadId,
        account_id: req.account.id
      },
      include: [{ model: User, as: 'uploadedByUser', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, files });
  },

  // GET /api/files/:fileId/download
  download: async (req, res) => {
    const { fileId } = req.params;

    const file = await LeadFile.findOne({
      where: { id: fileId, account_id: req.account.id }
    });

    if (!file) {
      return res.status(404).json({ success: false, message: 'Arquivo não encontrado' });
    }

    res.download(file.file_path, file.original_filename);
  }
};

function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'spreadsheet';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
  return 'other';
}
```

### **4. CustomFieldController**
```javascript
// src/controllers/customFieldController.js
const { CustomField, LeadCustomFieldValue } = require('../models');

module.exports = {
  // GET /api/custom-fields?entity_type=lead
  list: async (req, res) => {
    const { entity_type = 'lead' } = req.query;

    const fields = await CustomField.findAll({
      where: {
        account_id: req.account.id,
        entity_type,
        is_active: true
      },
      order: [['display_order', 'ASC']]
    });

    res.json({ success: true, fields });
  },

  // POST /api/custom-fields
  create: async (req, res) => {
    const { name, label, field_type, options, validation_rules, is_required, display_order } = req.body;

    const field = await CustomField.create({
      account_id: req.account.id,
      entity_type: 'lead',
      name,
      label,
      field_type,
      options,
      validation_rules,
      is_required,
      is_active: true,
      display_order: display_order || 999
    });

    res.status(201).json({ success: true, field });
  },

  // GET /api/leads/:leadId/custom-field-values
  getLeadValues: async (req, res) => {
    const { leadId } = req.params;

    const values = await LeadCustomFieldValue.findAll({
      where: {
        lead_id: leadId,
        account_id: req.account.id
      },
      include: [{ model: CustomField, as: 'customField' }]
    });

    res.json({ success: true, values });
  },

  // POST /api/leads/:leadId/custom-field-values
  setLeadValues: async (req, res) => {
    const { leadId } = req.params;
    const { values } = req.body; // Array of { custom_field_id, value }

    const results = [];

    for (const item of values) {
      const [fieldValue, created] = await LeadCustomFieldValue.upsert({
        lead_id: leadId,
        custom_field_id: item.custom_field_id,
        account_id: req.account.id,
        value: item.value
      });

      results.push(fieldValue);
    }

    res.json({ success: true, values: results });
  }
};
```

## 🔗 **Novas Rotas**

### **LeadActivity Routes**
```javascript
// src/routes/leadRoutes.js (adicionar)
router.get('/:leadId/activities', authenticateToken, leadActivityController.list);
router.post('/:leadId/activities', authenticateToken, leadActivityController.create);
```

### **LeadTask Routes**
```javascript
// src/routes/leadTaskRoutes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const leadTaskController = require('../controllers/leadTaskController');

const router = express.Router();

router.get('/:leadId/tasks', authenticateToken, leadTaskController.list);
router.post('/:leadId/tasks', authenticateToken, leadTaskController.create);
router.put('/:taskId', authenticateToken, leadTaskController.update);
router.delete('/:taskId', authenticateToken, leadTaskController.delete);

module.exports = router;
```

### **LeadFile Routes**
```javascript
// src/routes/leadFileRoutes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const leadFileController = require('../controllers/leadFileController');

const router = express.Router();

router.post('/:leadId/files', authenticateToken, leadFileController.upload.single('file'), leadFileController.uploadFile);
router.get('/:leadId/files', authenticateToken, leadFileController.list);
router.get('/files/:fileId/download', authenticateToken, leadFileController.download);
router.delete('/files/:fileId', authenticateToken, leadFileController.delete);

module.exports = router;
```

### **CustomField Routes**
```javascript
// src/routes/customFieldRoutes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const customFieldController = require('../controllers/customFieldController');

const router = express.Router();

router.get('/', authenticateToken, customFieldController.list);
router.post('/', authenticateToken, customFieldController.create);
router.get('/leads/:leadId/values', authenticateToken, customFieldController.getLeadValues);
router.post('/leads/:leadId/values', authenticateToken, customFieldController.setLeadValues);

module.exports = router;
```

## 🔄 **Modificações no Lead Controller Existente**

### **Adicionar logging automático de atividades**
```javascript
// src/controllers/leadController.js (modificar métodos existentes)
const { leadActivityController } = require('./leadActivityController');

// No método update
update: async (req, res) => {
  // ... código existente ...

  // Log activity after successful update
  if (updatedFields.includes('status')) {
    await leadActivityController.logActivity(
      lead.id,
      req.account.id,
      req.user.id,
      'status_change',
      `Status alterado para ${updatedLead.status}`,
      null,
      { old_status: lead.status, new_status: updatedLead.status }
    );
  }

  // ... resto do código ...
}
```

## 📊 **Sistema de Score de Engajamento**

### **Service para cálculo de score**
```javascript
// src/services/LeadScoreService.js
const { LeadScore, LeadActivity, LeadTask } = require('../models');

class LeadScoreService {
  static async calculateScore(leadId, accountId) {
    const factors = {
      recentActivity: 0,
      taskCompletion: 0,
      responseTime: 0,
      engagementFrequency: 0,
      valueIndicator: 0
    };

    // Recent Activity (30 points max)
    const recentActivities = await LeadActivity.count({
      where: {
        lead_id: leadId,
        account_id: accountId,
        created_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });
    factors.recentActivity = Math.min(recentActivities * 5, 30);

    // Task Completion (25 points max)
    const tasks = await LeadTask.findAll({
      where: { lead_id: leadId, account_id: accountId }
    });
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    factors.taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 25 : 0;

    // Calculate total score
    const totalScore = Math.round(
      factors.recentActivity +
      factors.taskCompletion +
      factors.responseTime +
      factors.engagementFrequency +
      factors.valueIndicator
    );

    // Determine engagement level
    let engagementLevel = 'cold';
    if (totalScore >= 80) engagementLevel = 'burning';
    else if (totalScore >= 60) engagementLevel = 'hot';
    else if (totalScore >= 40) engagementLevel = 'warm';

    // Update or create score record
    await LeadScore.upsert({
      lead_id: leadId,
      account_id: accountId,
      score: totalScore,
      last_activity_at: new Date(),
      engagement_level: engagementLevel,
      score_factors: factors,
      calculated_at: new Date()
    });

    return { score: totalScore, engagement_level: engagementLevel, factors };
  }

  static async updateScoreForActivity(leadId, accountId) {
    // Trigger score recalculation when activities happen
    return this.calculateScore(leadId, accountId);
  }
}

module.exports = LeadScoreService;
```

## 🔔 **Sistema de Notificações**

### **Task Reminder Service**
```javascript
// src/services/TaskReminderService.js
const { LeadTask, User } = require('../models');
const { Op } = require('sequelize');

class TaskReminderService {
  static async checkDueTasks() {
    const now = new Date();
    const dueTasks = await LeadTask.findAll({
      where: {
        status: ['pending', 'in_progress'],
        reminder_at: {
          [Op.lte]: now
        }
      },
      include: [
        { model: User, as: 'assignedUser' },
        { model: Lead, as: 'lead' }
      ]
    });

    for (const task of dueTasks) {
      // Send notification (email, push, etc.)
      await this.sendTaskReminder(task);

      // Update reminder to avoid duplicate notifications
      await task.update({
        reminder_at: null,
        metadata: {
          ...task.metadata,
          reminder_sent_at: now
        }
      });
    }

    return dueTasks.length;
  }

  static async sendTaskReminder(task) {
    // Implementation depends on notification service
    console.log(`Reminder: Task "${task.title}" is due for ${task.assignedUser.name}`);

    // Could integrate with:
    // - Email service (SendGrid, SES)
    // - Push notifications
    // - Slack/Teams webhooks
    // - SMS service
  }
}

module.exports = TaskReminderService;
```

## ⏰ **Cron Jobs**

### **Scheduled Tasks**
```javascript
// src/services/CronJobService.js (adicionar)
const TaskReminderService = require('./TaskReminderService');
const LeadScoreService = require('./LeadScoreService');

// Add to existing cron jobs
const scheduledJobs = [
  // ... existing jobs ...

  // Task reminders every 15 minutes
  {
    name: 'task-reminders',
    schedule: '*/15 * * * *',
    job: async () => {
      console.log('🔔 Checking for due task reminders...');
      const count = await TaskReminderService.checkDueTasks();
      console.log(`📬 Sent ${count} task reminders`);
    }
  },

  // Score recalculation daily at 2 AM
  {
    name: 'lead-score-update',
    schedule: '0 2 * * *',
    job: async () => {
      console.log('📊 Updating lead scores...');
      // Update scores for leads with recent activity
      // Implementation here...
    }
  }
];
```

## 🧪 **Testes**

### **Unit Tests para LeadActivity**
```javascript
// tests/unit/models/leadActivity.test.js
const { LeadActivity } = require('../../../src/models');

describe('LeadActivity Model', () => {
  test('should create activity with valid data', async () => {
    const activity = await LeadActivity.create({
      lead_id: 'test-lead-id',
      user_id: 'test-user-id',
      account_id: 'test-account-id',
      type: 'status_change',
      title: 'Status changed to qualified',
      description: 'Lead moved from new to qualified status'
    });

    expect(activity.id).toBeDefined();
    expect(activity.type).toBe('status_change');
    expect(activity.title).toBe('Status changed to qualified');
  });

  test('should require mandatory fields', async () => {
    await expect(LeadActivity.create({})).rejects.toThrow();
  });
});
```

### **Integration Tests para APIs**
```javascript
// tests/integration/leadActivity.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Lead Activities API', () => {
  test('GET /api/leads/:leadId/activities', async () => {
    const response = await request(app)
      .get('/api/leads/test-lead-id/activities')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.activities)).toBe(true);
  });

  test('POST /api/leads/:leadId/activities', async () => {
    const activityData = {
      type: 'note_added',
      title: 'Follow-up call scheduled',
      description: 'Client interested in premium package'
    };

    const response = await request(app)
      .post('/api/leads/test-lead-id/activities')
      .set('Authorization', `Bearer ${authToken}`)
      .send(activityData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.activity.type).toBe('note_added');
  });
});
```

## 📋 **Checklist de Implementação**

### **Fase 1: Modelos e Migrações**
- [ ] Criar modelo LeadActivity
- [ ] Criar modelo LeadContact
- [ ] Criar modelo LeadTask
- [ ] Criar modelo LeadFile
- [ ] Criar modelo CustomField
- [ ] Criar modelo LeadCustomFieldValue
- [ ] Criar modelo LeadScore
- [ ] Executar migrações no ambiente de desenvolvimento
- [ ] Executar migrações no ambiente de produção

### **Fase 2: Controllers e APIs**
- [ ] Implementar LeadActivityController
- [ ] Implementar LeadTaskController
- [ ] Implementar LeadFileController
- [ ] Implementar CustomFieldController
- [ ] Configurar rotas para todas as APIs
- [ ] Implementar middleware de upload de arquivos
- [ ] Adicionar validações nos controllers

### **Fase 3: Services**
- [ ] Implementar LeadScoreService
- [ ] Implementar TaskReminderService
- [ ] Integrar logging automático no LeadController
- [ ] Configurar cron jobs para lembretes
- [ ] Configurar cron jobs para scores

### **Fase 4: Testes**
- [ ] Testes unitários para todos os modelos
- [ ] Testes de integração para todas as APIs
- [ ] Testes de upload de arquivo
- [ ] Testes de cálculo de score
- [ ] Testes de notificações

### **Fase 5: Deploy**
- [ ] Configurar armazenamento de arquivos (S3/R2)
- [ ] Configurar serviço de email para notificações
- [ ] Executar migrações em produção
- [ ] Monitor de logs e erros
- [ ] Backup da base de dados

---

📅 **Estimativa**: 4-6 semanas
👥 **Recursos**: 1-2 desenvolvedores backend
🔧 **Dependências**: Sistema de storage, serviço de email
⚡ **Prioridade**: Alta - Base para funcionalidades frontend