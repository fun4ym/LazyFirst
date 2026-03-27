const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  deptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  role: {
    type: String,
    enum: ['admin', 'bd', 'viewer'],
    default: 'bd'
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  realName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    lowercase: true
  },
  avatar: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // 银行账号
  bankAccount: {
    type: String,
    default: '',
    comment: '银行账号'
  },
  // 任职状态: fulltime(全职) / parttime(兼职) / nocommission(无底薪)
  employmentStatus: {
    type: String,
    enum: ['fulltime', 'parttime', 'nocommission'],
    default: 'fulltime'
  },
  // 结算类型: monthly(月结) / weekly(周结)
  settlementType: {
    type: String,
    enum: ['monthly', 'weekly'],
    default: 'monthly'
  },
  // 结算日: 月结时为1-31，周结时为1-7(1=周一)
  settlementDay: {
    type: Number,
    default: 15
  }
}, {
  timestamps: true
});

// 索引
userSchema.index({ companyId: 1, username: 1 });
userSchema.index({ companyId: 1, deptId: 1 });

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 比较密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 隐藏密码
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
