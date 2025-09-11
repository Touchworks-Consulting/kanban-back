const { User } = require('../models');

function requireAdmin(req, res) {
  if (!req.user || !['owner','admin'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: 'Permissão negada' });
    return false;
  }
  return true;
}

module.exports = {
  list: async (req, res) => {
    try {
      const users = await User.findAll({ where: { account_id: req.account.id } });
      res.json({ success: true, users });
    } catch (e) {
      console.error('List users error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  me: async (req, res) => {
    res.json({ success: true, user: req.user });
  },
  create: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { name, email, password, role = 'member' } = req.body;
      if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email, password obrigatórios' });
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(400).json({ success: false, message: 'Email já em uso' });
      const user = await User.create({ account_id: req.account.id, name, email, password, role });
      res.status(201).json({ success: true, user });
    } catch (e) {
      console.error('Create user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  update: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { id } = req.params;
      const { name, role, password, is_active } = req.body;
      const user = await User.findOne({ where: { id, account_id: req.account.id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      if (name !== undefined) user.name = name;
      if (role !== undefined) user.role = role;
      if (password) user.password = password; // hook re-hash
      if (is_active !== undefined) user.is_active = is_active;
      await user.save();
      res.json({ success: true, user });
    } catch (e) {
      console.error('Update user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  },
  remove: async (req, res) => {
    try {
      if (!requireAdmin(req,res)) return;
      const { id } = req.params;
      const user = await User.findOne({ where: { id, account_id: req.account.id } });
      if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      user.is_active = false;
      await user.save();
      res.json({ success: true, message: 'Usuário desativado' });
    } catch (e) {
      console.error('Remove user error', e);
      res.status(500).json({ success: false, message: 'Erro interno' });
    }
  }
};
