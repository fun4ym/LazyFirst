const jwt = require('jsonwebtoken');
require('dotenv').config();

// 使用环境变量中的密钥，如果没有则使用默认值
const JWT_SECRET = process.env.JWT_SECRET || 'tap-system-secret-key-1126';

/**
 * 生成JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  generateToken,
  JWT_SECRET
};
