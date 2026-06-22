const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const AiModel = require('../models/AiModel');

const router = express.Router();

// 获取AI模型列表
router.get('/', authenticate, authorize('system:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, type, status } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (status) query.status = status;

    const models = await AiModel.find(query)
      .populate('createdBy', 'username realName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await AiModel.countDocuments(query);

    res.json({
      success: true,
      data: {
        models,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('AI模型列表获取失败:', error);
    res.status(500).json({
      success: false,
      message: '获取AI模型列表失败'
    });
  }
});

// 获取单个AI模型详情
router.get('/:id', authenticate, authorize('system:read'), async (req, res) => {
  try {
    const model = await AiModel.findById(req.params.id)
      .populate('createdBy', 'username realName')
      .lean();
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'AI模型不存在'
      });
    }
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('AI模型详情获取失败:', error);
    res.status(500).json({
      success: false,
      message: '获取AI模型详情失败'
    });
  }
});

// 创建AI模型
router.post('/', authenticate, authorize('system:write'), async (req, res) => {
  try {
    const { name, type, provider, config, description, status, isDefault } = req.body;
    
    // 验证必填字段
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: '模型名称和类型为必填项'
      });
    }

    const newModel = new AiModel({
      name,
      type,
      provider: provider || 'custom',
      config: config || {},
      description: description || '',
      status: status || 'active',
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    await newModel.save();

    res.status(201).json({
      success: true,
      data: newModel,
      message: 'AI模型创建成功'
    });
  } catch (error) {
    console.error('AI模型创建失败:', error);
    res.status(500).json({
      success: false,
      message: '创建AI模型失败'
    });
  }
});

// 更新AI模型
router.put('/:id', authenticate, authorize('system:write'), async (req, res) => {
  try {
    const { name, type, provider, config, description, status, isDefault } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (provider !== undefined) updateData.provider = provider;
    if (config !== undefined) updateData.config = config;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const updatedModel = await AiModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username realName');

    if (!updatedModel) {
      return res.status(404).json({
        success: false,
        message: 'AI模型不存在'
      });
    }

    res.json({
      success: true,
      data: updatedModel,
      message: 'AI模型更新成功'
    });
  } catch (error) {
    console.error('AI模型更新失败:', error);
    res.status(500).json({
      success: false,
      message: '更新AI模型失败'
    });
  }
});

// 删除AI模型
router.delete('/:id', authenticate, authorize('system:delete'), async (req, res) => {
  try {
    const deletedModel = await AiModel.findByIdAndDelete(req.params.id);
    if (!deletedModel) {
      return res.status(404).json({
        success: false,
        message: 'AI模型不存在'
      });
    }
    res.json({
      success: true,
      message: 'AI模型删除成功'
    });
  } catch (error) {
    console.error('AI模型删除失败:', error);
    res.status(500).json({
      success: false,
      message: '删除AI模型失败'
    });
  }
});

// 获取默认AI模型（用于工作区）
router.get('/default/active', authenticate, async (req, res) => {
  try {
    const defaultModel = await AiModel.findOne({ status: 'active', isDefault: true })
      .select('_id name type provider config')
      .lean();
    res.json({
      success: true,
      data: defaultModel || null
    });
  } catch (error) {
    console.error('获取默认AI模型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取默认AI模型失败'
    });
  }
});

module.exports = router;