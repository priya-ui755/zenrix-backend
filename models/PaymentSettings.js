const mongoose = require('mongoose');

const DEFAULT_BANK_DETAILS = {
  accountName: 'Zenrix Pvt. Ltd.',
  accountNumber: '1234567890',
  bankName: 'NMB Bank',
  branch: 'Kathmandu',
  swiftCode: 'NMBLNPKA'
};

const DEFAULT_WALLET = {
  enabled: true,
  walletNumber: '98XXXXXXXXX',
  qrImageUrl: '',
  instructions: ''
};

const nepaliWalletSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: DEFAULT_WALLET.enabled },
  walletNumber: { type: String, default: DEFAULT_WALLET.walletNumber },
  qrImageUrl: { type: String, default: DEFAULT_WALLET.qrImageUrl },
  instructions: { type: String, default: DEFAULT_WALLET.instructions }
}, { _id: false });

const paymentSettingsSchema = new mongoose.Schema({
  codEnabled: { type: Boolean, default: true },
  bankEnabled: { type: Boolean, default: true },
  bankDetails: {
    accountName: { type: String, default: DEFAULT_BANK_DETAILS.accountName },
    accountNumber: { type: String, default: DEFAULT_BANK_DETAILS.accountNumber },
    bankName: { type: String, default: DEFAULT_BANK_DETAILS.bankName },
    branch: { type: String, default: DEFAULT_BANK_DETAILS.branch },
    swiftCode: { type: String, default: DEFAULT_BANK_DETAILS.swiftCode }
  },
  qrImageUrl: { type: String, default: '' },
  instructions: { type: String, default: 'Upload the payment receipt to support@zenrix.com.np for faster verification.' },
  nepaliWallets: {
    esewa: { type: nepaliWalletSchema, default: () => ({ ...DEFAULT_WALLET }) },
    khalti: { type: nepaliWalletSchema, default: () => ({ ...DEFAULT_WALLET }) },
    imepay: { type: nepaliWalletSchema, default: () => ({ ...DEFAULT_WALLET }) }
  },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });

paymentSettingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    return this.create({});
  }

  let dirty = false;

  if (!settings.bankDetails) {
    settings.bankDetails = { ...DEFAULT_BANK_DETAILS };
    dirty = true;
  } else {
    Object.keys(DEFAULT_BANK_DETAILS).forEach((key) => {
      if (typeof settings.bankDetails[key] === 'undefined') {
        settings.bankDetails[key] = DEFAULT_BANK_DETAILS[key];
        dirty = true;
      }
    });
  }

  const walletKeys = ['esewa', 'khalti', 'imepay'];
  if (!settings.nepaliWallets || typeof settings.nepaliWallets !== 'object') {
    settings.nepaliWallets = walletKeys.reduce((acc, key) => {
      acc[key] = { ...DEFAULT_WALLET };
      return acc;
    }, {});
    dirty = true;
  } else {
    walletKeys.forEach((walletKey) => {
      if (!settings.nepaliWallets[walletKey]) {
        settings.nepaliWallets[walletKey] = { ...DEFAULT_WALLET };
        dirty = true;
        return;
      }

      const wallet = settings.nepaliWallets[walletKey];
      Object.keys(DEFAULT_WALLET).forEach((field) => {
        if (typeof wallet[field] === 'undefined') {
          wallet[field] = DEFAULT_WALLET[field];
          dirty = true;
        }
      });
    });
  }

  if (dirty) {
    await settings.save();
  }

  return settings;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
