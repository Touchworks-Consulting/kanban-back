const { Feedback, User, Account } = require('../../src/models');
const { authenticateToken } = require('../../src/middleware/auth');
const requestIp = require('request-ip');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Tenant-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Executar middleware de autenticação
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { type, message, browser_info, screen_resolution, current_page } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'Tipo e mensagem são obrigatórios' });
    }

    // Capturar informações automáticas
    const userAgent = req.headers['user-agent'];
    const ipAddress = requestIp.getClientIp(req);

    // Informações do usuário autenticado
    const user = req.user;

    // Criar feedback no banco
    const feedback = await Feedback.create({
      type,
      message,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      account_id: user.account_id,
      account_name: user.account?.display_name || 'N/A',
      user_agent: userAgent,
      ip_address: ipAddress,
      screen_resolution,
      browser_info,
      current_page,
      status: 'new',
      priority: type === 'bug' ? 'high' : 'medium'
    });

    console.log('Novo feedback recebido:', {
      id: feedback.id,
      type: feedback.type,
      user: feedback.user_name,
      account: feedback.account_name,
      created_at: feedback.created_at
    });

    res.json({
      success: true,
      message: 'Feedback enviado com sucesso!',
      feedback_id: feedback.id
    });
  } catch (error) {
    console.error('Erro ao salvar feedback:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};