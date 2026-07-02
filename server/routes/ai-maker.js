const router = require('express').Router();
const mongoose = require('mongoose');
const Influencer = require('../models/Influencer');
const VideoGenerationTask = require('../models/VideoGenerationTask');
const PointsTransaction = require('../models/PointsTransaction');
const PromptTemplate = require('../models/PromptTemplate');
const Product = require('../models/Product');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * 生成三视图（BD后台）
 * POST /api/ai-maker/generate-views
 * 
 * 输入：influencerId、photoUrl（照片URL）
 * 处理：调用火山引擎Seedream API生成三视图
 * 输出：三视图URL数组
 */
router.post('/generate-views', authenticate, authorize('ai_maker:create'), async (req, res) => {
  try {
    const { influencerId, photoUrl } = req.body;
    const { companyId } = req.user;
    
    if (!influencerId || !mongoose.Types.ObjectId.isValid(influencerId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的influencerId参数' });
    }
    
    if (!photoUrl) {
      return res.status(400).json({ success: false, message: '缺少photoUrl参数' });
    }
    
    // 验证达人是否存在
    const influencer = await Influencer.findOne({
      _id: new mongoose.Types.ObjectId(influencerId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }
    
    // TODO: 调用火山引擎Seedream API生成三视图
    // 暂时返回模拟数据
    const views = [
      { viewType: 'front', url: 'https://example.com/front.jpg' },
      { viewType: 'side', url: 'https://example.com/side.jpg' },
      { viewType: 'back', url: 'https://example.com/back.jpg' }
    ];
    
    res.json({
      success: true,
      data: {
        influencerId,
        views
      }
    });
  } catch (error) {
    console.error('生成三视图失败:', error);
    res.status(500).json({ success: false, message: '生成三视图失败' });
  }
});

/**
 * 生成视频（Influencer）
 * POST /api/ai-maker/generate-video
 * 
 * 输入：influencerId、productId、displayMode、style、duration
 * 处理：扣除点数、调用火山引擎Seedance API生成视频、创建任务记录
 * 输出：任务ID
 */
router.post('/generate-video', authenticate, authorize('ai_maker:create'), async (req, res) => {
  try {
    const { influencerId, productId, displayMode, style, duration } = req.body;
    const { companyId } = req.user;
    
    if (!influencerId || !mongoose.Types.ObjectId.isValid(influencerId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的influencerId参数' });
    }
    
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的productId参数' });
    }
    
    if (!displayMode || !['human', 'animated_human', 'product_only'].includes(displayMode)) {
      return res.status(400).json({ success: false, message: '缺少或无效的displayMode参数' });
    }
    
    if (!style || !['normal', 'crazy'].includes(style)) {
      return res.status(400).json({ success: false, message: '缺少或无效的style参数' });
    }
    
    if (!duration || ![5, 10].includes(duration)) {
      return res.status(400).json({ success: false, message: '缺少或无效的duration参数' });
    }
    
    // 验证达人是否存在
    const influencer = await Influencer.findOne({
      _id: new mongoose.Types.ObjectId(influencerId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }
    
    // 验证商品是否存在
    const product = await Product.findOne({
      _id: new mongoose.Types.ObjectId(productId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }
    
    // 计算需要消耗的点数
    const pointsNeeded = duration === 5 ? 100 : 200;
    
    // 检查点数余额
    if (influencer.pointsBalance < pointsNeeded) {
      return res.status(400).json({
        success: false,
        message: `点数余额不足，需要${pointsNeeded}点数，当前余额${influencer.pointsBalance}点数`
      });
    }
    
    // 扣除点数
    influencer.pointsBalance -= pointsNeeded;
    await influencer.save();
    
    // 创建点数交易记录
    const pointsTransaction = new PointsTransaction({
      influencerId: new mongoose.Types.ObjectId(influencerId),
      type: 'consume',
      amount: pointsNeeded,
      balance: influencer.pointsBalance,
      source: 'video_generate',
      description: `生成${duration}秒视频消耗${pointsNeeded}点数`
    });
    await pointsTransaction.save();
    
    // TODO: 调用火山引擎Seedance API生成视频
    // 暂时创建模拟任务
    const task = new VideoGenerationTask({
      influencerId: new mongoose.Types.ObjectId(influencerId),
      productId: new mongoose.Types.ObjectId(productId),
      prompt: '生成视频提示词',
      duration,
      displayMode,
      style,
      status: 'pending',
      pointsConsumed: pointsNeeded,
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    await task.save();
    
    res.json({
      success: true,
      data: {
        taskId: task._id,
        pointsBalance: influencer.pointsBalance
      }
    });
  } catch (error) {
    console.error('生成视频失败:', error);
    res.status(500).json({ success: false, message: '生成视频失败' });
  }
});

/**
 * 查询任务状态
 * GET /api/ai-maker/task-status/:taskId
 * 
 * 输入：taskId（任务ID）
 * 处理：查询VideoGenerationTask记录、调用火山引擎API查询状态（可选）
 * 输出：任务状态、视频URL（如果完成）
 */
router.get('/task-status/:taskId', authenticate, authorize('ai_maker:read'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { companyId } = req.user;
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的taskId参数' });
    }
    
    // 查询任务记录
    const task = await VideoGenerationTask.findOne({
      _id: new mongoose.Types.ObjectId(taskId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    
    // TODO: 调用火山引擎API查询任务状态（可选）
    
    res.json({
      success: true,
      data: {
        taskId: task._id,
        status: task.status,
        videoUrl: task.videoUrl,
        errorMessage: task.errorMessage,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    });
  } catch (error) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({ success: false, message: '查询任务状态失败' });
  }
});

/**
 * 获取提示词模板
 * GET /api/ai-maker/prompt-templates
 * 
 * 输入：productType、displayMode、style（可选）
 * 处理：查询PromptTemplate记录
 * 输出：提示词模板列表
 */
router.get('/prompt-templates', authenticate, authorize('ai_maker:read'), async (req, res) => {
  try {
    const { productType, displayMode, style } = req.query;
    const { companyId } = req.user;
    
    // 构建查询条件
    const query = {
      companyId: new mongoose.Types.ObjectId(companyId)
    };
    
    if (productType && mongoose.Types.ObjectId.isValid(productType)) {
      query.productType = new mongoose.Types.ObjectId(productType);
    }
    
    if (displayMode && ['human', 'animated_human', 'product_only'].includes(displayMode)) {
      query.displayMode = displayMode;
    }
    
    if (style && ['normal', 'crazy'].includes(style)) {
      query.style = style;
    }
    
    // 查询提示词模板
    const templates = await PromptTemplate.find(query)
      .populate('productType', 'name')
      .populate('createdBy', 'username realName name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    res.status(500).json({ success: false, message: '获取提示词模板失败' });
  }
});

/**
 * 创建提示词模板（BD）
 * POST /api/ai-maker/prompt-templates
 * 
 * 输入：name、productType、displayMode、style、template、variables
 * 处理：创建新的PromptTemplate记录
 * 输出：创建的模板
 */
router.post('/prompt-templates', authenticate, authorize('ai_maker:manage'), async (req, res) => {
  try {
    const { name, productType, displayMode, style, template, variables } = req.body;
    const { companyId, userId } = req.user;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '缺少name参数' });
    }
    
    if (!productType || !mongoose.Types.ObjectId.isValid(productType)) {
      return res.status(400).json({ success: false, message: '缺少或无效的productType参数' });
    }
    
    if (!displayMode || !['human', 'animated_human', 'product_only'].includes(displayMode)) {
      return res.status(400).json({ success: false, message: '缺少或无效的displayMode参数' });
    }
    
    if (!style || !['normal', 'crazy'].includes(style)) {
      return res.status(400).json({ success: false, message: '缺少或无效的style参数' });
    }
    
    if (!template) {
      return res.status(400).json({ success: false, message: '缺少template参数' });
    }
    
    // 创建提示词模板
    const promptTemplate = new PromptTemplate({
      name,
      productType: new mongoose.Types.ObjectId(productType),
      displayMode,
      style,
      template,
      variables: variables || [],
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(userId)
    });
    
    await promptTemplate.save();
    
    // 查询创建者信息
    await promptTemplate.populate('createdBy', 'username realName name');
    await promptTemplate.populate('productType', 'name');
    
    res.json({ success: true, data: promptTemplate });
  } catch (error) {
    console.error('创建提示词模板失败:', error);
    res.status(500).json({ success: false, message: '创建提示词模板失败' });
  }
});

/**
 * 查询点数余额（Influencer）
 * GET /api/ai-maker/points-balance
 * 
 * 输入：influencerId
 * 处理：查询Influencer的pointsBalance字段、查询PointsTransaction记录
 * 输出：点数余额、交易记录
 */
router.get('/points-balance', authenticate, authorize('ai_maker:read'), async (req, res) => {
  try {
    const { influencerId } = req.query;
    const { companyId, userId, role } = req.user;
    
    let targetInfluencerId = influencerId;
    
    // 如果Influencer角色且没有指定influencerId，则查询自己的点数余额
    if (!targetInfluencerId && role === 'influencer') {
      const influencer = await Influencer.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        companyId: new mongoose.Types.ObjectId(companyId)
      });
      
      if (!influencer) {
        return res.status(404).json({ success: false, message: '达人信息不存在' });
      }
      
      targetInfluencerId = influencer._id;
    }
    
    if (!targetInfluencerId || !mongoose.Types.ObjectId.isValid(targetInfluencerId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的influencerId参数' });
    }
    
    // 查询达人信息
    const influencer = await Influencer.findOne({
      _id: new mongoose.Types.ObjectId(targetInfluencerId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }
    
    // 查询交易记录
    const transactions = await PointsTransaction.find({
      influencerId: new mongoose.Types.ObjectId(targetInfluencerId)
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json({
      success: true,
      data: {
        influencerId: targetInfluencerId,
        pointsBalance: influencer.pointsBalance,
        transactions
      }
    });
  } catch (error) {
    console.error('查询点数余额失败:', error);
    res.status(500).json({ success: false, message: '查询点数余额失败' });
  }
});

/**
 * 购买点数（Influencer）
 * POST /api/ai-maker/purchase-points
 * 
 * 输入：influencerId、package（套餐A/B/C）
 * 处理：更新Influencer的pointsBalance字段、创建PointsTransaction记录
 * 输出：更新后的点数余额
 */
router.post('/purchase-points', authenticate, authorize('ai_maker:purchase'), async (req, res) => {
  try {
    const { influencerId, package: packageType } = req.body;
    const { companyId, userId, role } = req.user;
    
    let targetInfluencerId = influencerId;
    
    // 如果Influencer角色，则只能购买自己的点数
    if (role === 'influencer') {
      const influencer = await Influencer.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        companyId: new mongoose.Types.ObjectId(companyId)
      });
      
      if (!influencer) {
        return res.status(404).json({ success: false, message: '达人信息不存在' });
      }
      
      targetInfluencerId = influencer._id;
    }
    
    if (!targetInfluencerId || !mongoose.Types.ObjectId.isValid(targetInfluencerId)) {
      return res.status(400).json({ success: false, message: '缺少或无效的influencerId参数' });
    }
    
    if (!packageType || !['A', 'B', 'C'].includes(packageType)) {
      return res.status(400).json({ success: false, message: '缺少或无效的package参数' });
    }
    
    // 套餐配置
    const packageConfig = {
      'A': { points: 500, price: 500 },
      'B': { points: 2000, price: 1800 },
      'C': { points: 5000, price: 4000 }
    };
    
    const config = packageConfig[packageType];
    
    // 查询达人信息
    const influencer = await Influencer.findOne({
      _id: new mongoose.Types.ObjectId(targetInfluencerId),
      companyId: new mongoose.Types.ObjectId(companyId)
    });
    
    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }
    
    // TODO: 调用支付API完成支付
    
    // 更新点数余额
    influencer.pointsBalance += config.points;
    await influencer.save();
    
    // 创建点数交易记录
    const pointsTransaction = new PointsTransaction({
      influencerId: new mongoose.Types.ObjectId(targetInfluencerId),
      type: 'earn',
      amount: config.points,
      balance: influencer.pointsBalance,
      source: 'purchase',
      description: `购买点数套餐${packageType}，获得${config.points}点数`
    });
    await pointsTransaction.save();
    
    res.json({
      success: true,
      data: {
        influencerId: targetInfluencerId,
        pointsBalance: influencer.pointsBalance,
        package: packageType,
        pointsAdded: config.points,
        price: config.price
      }
    });
  } catch (error) {
    console.error('购买点数失败:', error);
    res.status(500).json({ success: false, message: '购买点数失败' });
  }
});

module.exports = router;
