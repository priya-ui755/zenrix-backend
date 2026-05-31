const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  slug: { type: String, default: 'site-settings' },
  siteTitle: { type: String, default: 'Fashion Hub' },
  companyName: { type: String, default: 'Fashion Hub' },
  supportEmail: { type: String, default: 'support@fashionhub.com' },
  supportPhone: { type: String, default: '+9779819922314' },
  supportChatLink: { type: String, default: '/index.html#chat' },
  supportHours: { type: String, default: '' },
  legalEmail: { type: String, default: 'legal@fashionhub.com.np' },
  address: { type: String, default: '123 Commerce St, New York, NY 10001' },
  mapEmbedUrl: { type: String, default: 'https://www.google.com/maps?q=123+Commerce+St+New+York+NY+10001&output=embed' },
  socialLinks: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  },
  footerHtml: { type: String, default: '' },
  footerBottomText: { type: String, default: '© 2026 Fashion Hub. All rights reserved.' },
  heroTextOverrides: { type: Object, default: {} },
  // New branding fields
  logoUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#4f46e5' },
  secondaryColor: { type: String, default: '#2563eb' },
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
        supportEmail: data.supportEmail || 'support@fashionhub.com',
        supportPhone: data.supportPhone || '+9779819922314',
        supportChatLink: data.chatLink || '/index.html#chat',
        mapEmbedUrl: data.mapEmbed || '',
        address: data.address || '',
        footerBottomText: data.bottomText || '© 2026 Fashion Hub. All rights reserved.'
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
