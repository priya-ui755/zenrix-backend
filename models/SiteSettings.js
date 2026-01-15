const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  slug: { type: String, default: 'site-settings' },
  siteTitle: { type: String, default: 'Zenrix' },
  companyName: { type: String, default: 'Zenrix' },
  supportEmail: { type: String, default: 'support@zenrix.com' },
  supportPhone: { type: String, default: '+9779819922314' },
  supportChatLink: { type: String, default: '/index.html#chat' },
  supportHours: { type: String, default: '' },
  legalEmail: { type: String, default: 'legal@zenrix.com.np' },
  address: { type: String, default: '123 Commerce St, New York, NY 10001' },
  mapEmbedUrl: { type: String, default: 'https://www.google.com/maps?q=123+Commerce+St+New+York+NY+10001&output=embed' },
  socialLinks: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  },
  footerHtml: { type: String, default: '' },
  footerBottomText: { type: String, default: '© 2026 Zenrix. All rights reserved.' },
  heroTextOverrides: { type: Object, default: {} },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });

siteSettingsSchema.statics.getOrCreate = async function () {
  let s = await this.findOne();
  if (s) return s;

  // Try to seed from existing footer component if available
  try {
    const Component = require('./Component');
    const footer = await Component.findOne({ slug: 'footer' });
    if (footer && footer.data) {
      const data = footer.data || {};
      const seed = {
        supportEmail: data.supportEmail || 'support@zenrix.com',
        supportPhone: data.supportPhone || '+9779819922314',
        supportChatLink: data.chatLink || '/index.html#chat',
        mapEmbedUrl: data.mapEmbed || '',
        address: data.address || '',
        footerBottomText: data.bottomText || '© 2026 Zenrix. All rights reserved.'
      };
      s = await this.create(seed);
      return s;
    }
  } catch (e) {
    // ignore and create default
  }

  return this.create({});
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
