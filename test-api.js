const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🔐 Testando login...');
        
        // 1. Fazer login
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                api_key: 'demo_api_key_change_me'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Erro no login:', await loginResponse.text());
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login realizado com sucesso');
        
        const token = loginData.token;

        // 2. Testar dashboard
        console.log('\n📊 Testando dashboard...');
        const dashboardResponse = await fetch('http://localhost:3000/api/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (dashboardResponse.ok) {
            const dashboard = await dashboardResponse.json();
            console.log('✅ Dashboard funcionando');
            console.log('📈 Total de leads:', dashboard.overview.total_leads);
            console.log('🤖 Automações ativas:', dashboard.automations?.active_count || 0);
            console.log('📅 Cron jobs ativos:', dashboard.cron_jobs?.active_count || 0);
        } else {
            console.log('❌ Erro no dashboard:', await dashboardResponse.text());
        }

        // 3. Testar lista de automações
        console.log('\n🤖 Testando automações...');
        const automationsResponse = await fetch('http://localhost:3000/api/automations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (automationsResponse.ok) {
            const automations = await automationsResponse.json();
            console.log('✅ Automações carregadas:', automations.automations.length);
            automations.automations.forEach(auto => {
                console.log(`  • ${auto.name} - ${auto.is_active ? 'Ativa' : 'Inativa'}`);
            });
        } else {
            console.log('❌ Erro nas automações:', await automationsResponse.text());
        }

        // 4. Testar lista de cron jobs
        console.log('\n📅 Testando cron jobs...');
        const cronJobsResponse = await fetch('http://localhost:3000/api/cron-jobs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (cronJobsResponse.ok) {
            const cronJobs = await cronJobsResponse.json();
            console.log('✅ Cron jobs carregados:', cronJobs.cronJobs.length);
            cronJobs.cronJobs.forEach(job => {
                console.log(`  • ${job.name} - ${job.is_active ? 'Ativo' : 'Inativo'}`);
            });
        } else {
            console.log('❌ Erro nos cron jobs:', await cronJobsResponse.text());
        }

        // 5. Testar criação de lead via webhook
        console.log('\n🔗 Testando webhook...');
        const webhookResponse = await fetch('http://localhost:3000/api/webhooks/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Teste Webhook',
                email: 'teste@webhook.com',
                phone: '+5511999999999',
                message: 'Lead de teste via webhook',
                source_url: 'https://wa.me/5511999999999'
            })
        });

        if (webhookResponse.ok) {
            const webhook = await webhookResponse.json();
            console.log('✅ Webhook funcionando');
            console.log('🎯 Plataforma detectada:', webhook.lead.detected_platform);
            console.log('⚡ Automações disparadas:', webhook.automations_triggered);
        } else {
            console.log('❌ Erro no webhook:', await webhookResponse.text());
        }

        console.log('\n🎉 Todos os testes concluídos!');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

testAPI();
