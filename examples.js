const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('./src/database/connection');
const { Account, CronJob, Automation, Lead, Tag, KanbanColumn } = require('./src/models');

async function createExamples() {
    try {
        
        
        // Buscar conta existente
        const account = await Account.findOne({
            where: { email: 'admin@example.com' }
        });

        if (!account) {
            console.log('❌ Conta não encontrada');
            return;
        }

        console.log(`✅ Conta encontrada: ${account.name}`);

        // Criar alguns Cron Jobs de exemplo
        console.log('\n📅 Criando Cron Jobs de exemplo...');

        const cronJobs = [
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Relatório Diário de Leads',
                description: 'Gera relatório com os leads recebidos nas últimas 24 horas',
                type: 'report_generation',
                cron_expression: '0 9 * * *', // Todo dia às 9h
                is_active: true,
                conditions: {
                    period: '24h',
                    include_stats: true
                },
                actions: {
                    generate_report: {
                        format: 'excel',
                        include_charts: true
                    },
                    send_email: {
                        recipients: ['admin@example.com'],
                        subject: 'Relatório Diário de Leads'
                    }
                }
            },
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Limpeza de Leads Antigos',
                description: 'Remove leads inativos há mais de 6 meses',
                type: 'data_cleanup',
                cron_expression: '0 2 1 * *', // Todo dia 1 do mês às 2h
                is_active: true,
                conditions: {
                    inactive_days: 180,
                    status: 'lost'
                },
                actions: {
                    delete_leads: {
                        backup_before: true
                    }
                }
            },
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Backup Semanal',
                description: 'Realiza backup completo do banco de dados',
                type: 'backup',
                cron_expression: '0 3 * * 0', // Todo domingo às 3h
                is_active: true,
                conditions: {},
                actions: {
                    backup_database: {
                        compress: true,
                        retention_days: 30
                    }
                }
            }
        ];

        for (const cronJob of cronJobs) {
            await CronJob.create(cronJob);
            console.log(`  ✅ ${cronJob.name}`);
        }

        // Criar algumas Automações de exemplo
        console.log('\n🤖 Criando Automações de exemplo...');

        const automations = [
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Bem-vindo a Novos Leads',
                description: 'Envia email de boas-vindas para novos leads',
                trigger_type: 'lead_created',
                trigger_conditions: {
                    platform: ['whatsapp', 'facebook', 'instagram']
                },
                actions: [
                    {
                        type: 'send_email',
                        config: {
                            template: 'welcome',
                            delay_minutes: 5
                        }
                    },
                    {
                        type: 'add_tag',
                        config: {
                            tag_name: 'novo-lead'
                        }
                    }
                ],
                is_active: true,
                priority: 1
            },
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Follow-up Leads Qualificados',
                description: 'Agenda follow-up para leads que foram qualificados',
                trigger_type: 'lead_status_changed',
                trigger_conditions: {
                    from_status: 'new',
                    to_status: 'qualified'
                },
                actions: [
                    {
                        type: 'schedule_task',
                        config: {
                            task_type: 'follow_up_call',
                            delay_hours: 24,
                            assigned_to: 'vendas@example.com'
                        }
                    },
                    {
                        type: 'move_kanban',
                        config: {
                            column_name: 'Em Contato'
                        }
                    }
                ],
                is_active: true,
                priority: 2
            },
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Alerta Lead Alto Valor',
                description: 'Notifica equipe quando lead tem alto potencial',
                trigger_type: 'tag_added',
                trigger_conditions: {
                    tag_names: ['alto-valor', 'enterprise']
                },
                actions: [
                    {
                        type: 'send_notification',
                        config: {
                            type: 'slack',
                            channel: '#vendas-priority',
                            message: 'Novo lead de alto valor detectado!'
                        }
                    },
                    {
                        type: 'assign_user',
                        config: {
                            user_email: 'gerente@example.com'
                        }
                    }
                ],
                is_active: true,
                priority: 3
            },
            {
                id: uuidv4(),
                account_id: account.id,
                name: 'Lembrete de Follow-up',
                description: 'Lembra de fazer follow-up em leads sem interação',
                trigger_type: 'time_based',
                trigger_conditions: {
                    days_without_activity: 3,
                    status: ['qualified', 'in_contact']
                },
                actions: [
                    {
                        type: 'create_task',
                        config: {
                            title: 'Follow-up necessário',
                            description: 'Lead sem atividade há 3 dias',
                            priority: 'high'
                        }
                    }
                ],
                is_active: true,
                priority: 1,
                delay_minutes: 0
            }
        ];

        for (const automation of automations) {
            await Automation.create(automation);
            console.log(`  ✅ ${automation.name}`);
        }

        // Criar algumas tags de exemplo se não existirem
        console.log('\n🏷️  Criando Tags de exemplo...');

        const tags = [
            { name: 'alto-valor', color: '#ff6b6b', account_id: account.id },
            { name: 'enterprise', color: '#4ecdc4', account_id: account.id },
            { name: 'novo-lead', color: '#45b7d1', account_id: account.id },
            { name: 'follow-up', color: '#f7b731', account_id: account.id },
            { name: 'qualificado', color: '#5f27cd', account_id: account.id }
        ];

        for (const tag of tags) {
            const [tagInstance, created] = await Tag.findOrCreate({
                where: { name: tag.name, account_id: tag.account_id },
                defaults: tag
            });
            
            if (created) {
                console.log(`  ✅ ${tag.name}`);
            } else {
                console.log(`  ⚠️  ${tag.name} (já existe)`);
            }
        }

        // Criar colunas do Kanban se não existirem
        console.log('\n📋 Verificando colunas do Kanban...');

        const columns = [
            { name: 'Novos Leads', position: 0, color: '#e3f2fd', account_id: account.id },
            { name: 'Qualificados', position: 1, color: '#f3e5f5', account_id: account.id },
            { name: 'Em Contato', position: 2, color: '#fff3e0', account_id: account.id },
            { name: 'Proposta Enviada', position: 3, color: '#e8f5e8', account_id: account.id },
            { name: 'Fechados', position: 4, color: '#e1f5fe', account_id: account.id },
            { name: 'Perdidos', position: 5, color: '#ffebee', account_id: account.id }
        ];

        for (const column of columns) {
            const [columnInstance, created] = await KanbanColumn.findOrCreate({
                where: { name: column.name, account_id: column.account_id },
                defaults: column
            });
            
            if (created) {
                console.log(`  ✅ ${column.name}`);
            } else {
                console.log(`  ⚠️  ${column.name} (já existe)`);
            }
        }

        console.log('\n🎉 Dados de exemplo criados com sucesso!');
        console.log('\n📚 Recursos disponíveis:');
        console.log('  • 3 Cron Jobs configurados');
        console.log('  • 4 Automações ativas');
        console.log('  • 5 Tags para classificação');
        console.log('  • 6 Colunas do Kanban');
        
        console.log('\n🔗 Endpoints principais:');
        console.log('  • GET /api/cron-jobs - Listar cron jobs');
        console.log('  • POST /api/cron-jobs - Criar novo cron job');
        console.log('  • GET /api/automations - Listar automações');
        console.log('  • POST /api/automations - Criar nova automação');
        console.log('  • GET /api/dashboard - Ver métricas');
        console.log('  • POST /api/webhooks/lead - Receber novos leads');

    } catch (error) {
        console.error('❌ Erro ao criar dados de exemplo:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createExamples().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { createExamples };
