const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contact: {
    type: String
  },
  phone: {
    type: String
  },
  email: {
    type: String,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  settings: {
    defaultCurrency: {
      type: String,
      default: 'USD'
    },
    defaultCountry: {
      type: String,
      default: 'US'
    },
    sampleTimeout: {
      type: Number,
      default: 7
    },
    flowRules: {
      publicPoolReturnDays: {
        type: Number,
        default: 30
      },
      privatePoolMaxDays: {
        type: Number,
        default: 90
      }
    },
    // LINE 官方账号 OA 级模板（欢迎语 / 政策 / 客服自动回复），支持 {昵称} 占位符，双语
    lineTemplates: {
      autoReplyEnabled: { type: Boolean, default: true },
      welcome: {
        th: { type: String, default: '' },
        en: { type: String, default: '' }
      },
      policy: {
        th: { type: String, default: '' },
        en: { type: String, default: '' }
      },
      contactReply: {
        th: { type: String, default: '' },
        en: { type: String, default: '' }
      }
    }
  }
}, {
  timestamps: true
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
