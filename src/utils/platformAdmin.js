/**
 * Utilitário para verificar se um usuário é administrador da plataforma (super admin).
 * 
 * Configuração via variável de ambiente:
 * PLATFORM_ADMIN_EMAILS=email1@example.com,email2@example.com
 * 
 * O platform admin tem acesso a TODAS as contas do sistema.
 */

const isPlatformAdmin = (userEmail) => {
  if (!userEmail) return false;
  
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  
  return adminEmails.includes(userEmail.toLowerCase());
};

module.exports = { isPlatformAdmin };
