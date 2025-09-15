const { PlatformConfig } = require('../models');

class PlatformDetectionService {
  static async detectPlatform(sourceUrl, message, accountId) {
    let platform = 'unknown';
    let campaign = '';

    // First, try to detect by source URL
    if (sourceUrl) {
      platform = this.detectByUrl(sourceUrl);
    }

    // If platform is still unknown, try to detect by message using configured phrases
    if (platform === 'unknown' && message) {
      const detection = await this.detectByMessage(message, accountId);
      platform = detection.platform;
      campaign = detection.campaign;
    }

    return { platform, campaign };
  }

  static detectByUrl(sourceUrl) {
    const url = sourceUrl.toLowerCase();
    
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      return 'facebook';
    }
    
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    
    if (url.includes('google.com') || url.includes('googleads.com')) {
      return 'google';
    }
    
    if (url.includes('youtube.com')) {
      return 'youtube';
    }
    
    if (url.includes('linkedin.com')) {
      return 'linkedin';
    }
    
    if (url.includes('tiktok.com')) {
      return 'tiktok';
    }
    
    if (url.includes('whatsapp.com') || url.includes('wa.me')) {
      return 'whatsapp';
    }

    return 'unknown';
  }

  static async detectByMessage(message, accountId) {
    try {
      const configs = await PlatformConfig.findAll({
        where: {
          account_id: accountId,
          is_active: true
        },
        order: [['phrase', 'DESC']] // Longer phrases first for better matching
      });

      const messageText = message.toLowerCase();

      for (const config of configs) {
        const phrase = config.phrase.toLowerCase();
        if (messageText.includes(phrase)) {
          return {
            platform: config.platform,
            campaign: config.campaign
          };
        }
      }

      return { platform: 'unknown', campaign: '' };
    } catch (error) {
      console.error('Erro ao detectar plataforma por mensagem:', error);
      return { platform: 'unknown', campaign: '' };
    }
  }

  static getPlatformIcon(platform) {
    const icons = {
      facebook: 'facebook',
      instagram: 'instagram',
      google: 'search',
      youtube: 'play',
      linkedin: 'linkedin',
      tiktok: 'music',
      whatsapp: 'message-circle',
      unknown: 'help-circle'
    };

    return icons[platform] || icons.unknown;
  }

  static getPlatformColor(platform) {
    const colors = {
      facebook: '#1877f2',
      instagram: '#e4405f',
      google: '#4285f4',
      youtube: '#ff0000',
      linkedin: '#0077b5',
      tiktok: '#000000',
      whatsapp: '#25d366',
      unknown: '#6b7280'
    };

    return colors[platform] || colors.unknown;
  }
}

module.exports = PlatformDetectionService;
