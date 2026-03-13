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
    }
  }
}, {
  timestamps: true
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
