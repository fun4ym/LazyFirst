const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/database');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const departmentRoutes = require('./routes/departments');
const influencerManagementRoutes = require('./routes/influencer-managements');
const productRoutes = require('./routes/products');
const activityRoutes = require('./routes/activities');
const orderRoutes = require('./routes/orders');
const commissionRoutes = require('./routes/commissions');
const sampleRoutes = require('./routes/samples');
const performanceRoutes = require('./routes/performance');
const reportOrderRoutes = require('./routes/report-orders');
const commissionRuleRoutes = require('./routes/commission-rules');
const baseDataRoutes = require('./routes/base-data');
const bdDailyRoutes = require('./routes/bd-daily');
const dashboardRoutes = require('./routes/dashboard');
const shopRoutes = require('./routes/shops');
const productStatsRoutes = require('./routes/product-stats');
const publicSampleRoutes = require('./routes/public-samples');
const initializationRoutes = require('./routes/initialization');
const initImportRoutes = require('./routes/init-import');
const recruitmentRoutes = require('./routes/recruitments');
const publicRecruitmentRoutes = require('./routes/public-recruitment');
const publicProductsRoutes = require('./routes/public-products');
const videoRoutes = require('./routes/videos');

// 中间件导入
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// 安全中间件
// app.use(helmet()); // 临时禁用以排查 CORS 问题
app.use(compression());

// CORS配置
app.use(cors({
  origin: '*', // 允许所有来源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求日志
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流（临时禁用以排查问题）
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000个请求
  message: '请求过于频繁，请稍后再试'
});

// 认证请求限流
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 认证请求限流更严格
  message: '登录请求过于频繁，请稍后再试'
});

app.use('/api/auth', authLimiter);
*/

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/influencer-managements', influencerManagementRoutes);
app.use('/api/products', productRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/report-orders', reportOrderRoutes);
app.use('/api/commission-rules', commissionRuleRoutes);
app.use('/api/base-data', baseDataRoutes);
app.use('/api/bd-daily', bdDailyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/product-stats', productStatsRoutes);
app.use('/api/public/samples', publicSampleRoutes);
app.use('/api/public/base-data', baseDataRoutes);  // 公开的基础数据接口
app.use('/api/initialization', initializationRoutes);
app.use('/api/init-import', initImportRoutes);
app.use('/api/recruitments', recruitmentRoutes);
app.use('/api/public/recruitment', publicRecruitmentRoutes);
app.use('/api/public/products', publicProductsRoutes);
app.use('/api/public/videos', require('./routes/public-videos'));
app.use('/api/videos', videoRoutes);

// 错误处理
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// 启动服务器
if (process.env.NODE_ENV !== 'test') {
  // 先连接数据库
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;
