const { CronJob } = require('../src/models');

/**
 * Script para configurar jobs de notificação de atividades
 * Execute: node scripts/setup-activity-notifications.js
 */

async function setupActivityNotificationJobs() {
  try {
    console.log('🔧 Configurando jobs de notificação de atividades...');

    // Job 1: Marcar atividades vencidas (a cada hora)
    const markOverdueJob = await CronJob.findOrCreate({
      where: {
        name: 'Marcar Atividades Vencidas',
        type: 'activity_overdue'
      },
      defaults: {
        name: 'Marcar Atividades Vencidas',
        description: 'Job para marcar atividades como vencidas automaticamente',
        type: 'activity_overdue',
        cron_expression: '0 * * * *', // A cada hora
        is_active: true,
        conditions: {},
        actions: {
          mark_overdue: true
        },
        timeout_seconds: 300,
        max_retries: 3
      }
    });

    if (markOverdueJob[1]) {
      console.log('✅ Job "Marcar Atividades Vencidas" criado');
    } else {
      console.log('ℹ️  Job "Marcar Atividades Vencidas" já existe');
    }

    // Job 2: Notificar atividades vencidas (3x por dia: 9h, 14h, 18h)
    const notifyOverdueJob = await CronJob.findOrCreate({
      where: {
        name: 'Notificar Atividades Vencidas',
        type: 'email_notification'
      },
      defaults: {
        name: 'Notificar Atividades Vencidas',
        description: 'Job para enviar notificações de atividades vencidas',
        type: 'email_notification',
        cron_expression: '0 9,14,18 * * *', // 9h, 14h e 18h todos os dias
        is_active: true,
        conditions: {
          notification_type: 'overdue_activities'
        },
        actions: {
          send_overdue_notifications: true
        },
        timeout_seconds: 600,
        max_retries: 2
      }
    });

    if (notifyOverdueJob[1]) {
      console.log('✅ Job "Notificar Atividades Vencidas" criado');
    } else {
      console.log('ℹ️  Job "Notificar Atividades Vencidas" já existe');
    }

    // Job 3: Notificar atividades do dia (diariamente às 8h)
    const notifyTodayJob = await CronJob.findOrCreate({
      where: {
        name: 'Notificar Atividades do Dia',
        type: 'email_notification'
      },
      defaults: {
        name: 'Notificar Atividades do Dia',
        description: 'Job para enviar notificações de atividades do dia',
        type: 'email_notification',
        cron_expression: '0 8 * * *', // 8h todos os dias
        is_active: true,
        conditions: {
          notification_type: 'today_activities'
        },
        actions: {
          send_today_notifications: true
        },
        timeout_seconds: 300,
        max_retries: 2
      }
    });

    if (notifyTodayJob[1]) {
      console.log('✅ Job "Notificar Atividades do Dia" criado');
    } else {
      console.log('ℹ️  Job "Notificar Atividades do Dia" já existe');
    }

    // Job 4: Verificar lembretes (a cada 5 minutos)
    const checkRemindersJob = await CronJob.findOrCreate({
      where: {
        name: 'Verificar Lembretes de Atividades',
        type: 'follow_up_reminder'
      },
      defaults: {
        name: 'Verificar Lembretes de Atividades',
        description: 'Job para verificar e enviar lembretes de atividades',
        type: 'follow_up_reminder',
        cron_expression: '*/5 * * * *', // A cada 5 minutos
        is_active: true,
        conditions: {
          reminder_type: 'activity_reminders'
        },
        actions: {
          check_reminders: true
        },
        timeout_seconds: 120,
        max_retries: 1
      }
    });

    if (checkRemindersJob[1]) {
      console.log('✅ Job "Verificar Lembretes de Atividades" criado');
    } else {
      console.log('ℹ️  Job "Verificar Lembretes de Atividades" já existe');
    }

    console.log('🎉 Configuração de jobs de notificação concluída!');
    console.log('');
    console.log('📋 Jobs configurados:');
    console.log('  • Marcar Atividades Vencidas (a cada hora)');
    console.log('  • Notificar Atividades Vencidas (9h, 14h, 18h)');
    console.log('  • Notificar Atividades do Dia (8h diariamente)');
    console.log('  • Verificar Lembretes (a cada 5 minutos)');
    console.log('');
    console.log('Para ativar os jobs, certifique-se de que o serviço de cron jobs está rodando.');

  } catch (error) {
    console.error('❌ Erro ao configurar jobs:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  setupActivityNotificationJobs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erro:', error);
      process.exit(1);
    });
}

module.exports = setupActivityNotificationJobs;