const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const DigitalHuman = require('../models/DigitalHuman');
const AiModel = require('../models/AiModel');

const router = express.Router();

// 获取数字人列表
router.get('/', authenticate, authorize('system:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (status) query.status = status;

    const digitalHumans = await DigitalHuman.find(query)
      .populate('createdBy', 'username realName')
      .populate('aiModelId', 'name type provider')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await DigitalHuman.countDocuments(query);

    res.json({
      success: true,
      data: {
        digitalHumans,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('数字人列表获取失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数字人列表失败'
    });
  }
});

// 获取单个数字人详情
router.get('/:id', authenticate, authorize('system:read'), async (req, res) => {
  try {
    const digitalHuman = await DigitalHuman.findById(req.params.id)
      .populate('createdBy', 'username realName')
      .populate('aiModelId', 'name type provider config')
      .lean();
    if (!digitalHuman) {
      return res.status(404).json({
        success: false,
        message: '数字人不存在'
      });
    }
    res.json({
      success: true,
      data: digitalHuman
    });
  } catch (error) {
    console.error('数字人详情获取失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数字人详情失败'
    });
  }
});

// 创建数字人
router.post('/', authenticate, authorize('system:write'), async (req, res) => {
  try {
    const { name, description, avatar, references, config, status, aiModelId } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '数字人名称为必填项'
      });
    }

    // 验证关联的AI模型是否存在
    if (aiModelId) {
      const aiModel = await AiModel.findById(aiModelId);
      if (!aiModel) {
        return res.status(400).json({
          success: false,
          message: '关联的AI模型不存在'
        });
      }
    }

    // 处理 references 数组，自动设置 avatar 为 references[0]
    const refArray = Array.isArray(references) ? references : (references ? [references] : []);
    const mainAvatar = refArray.length > 0 ? refArray[0] : (avatar || '');

    const newDigitalHuman = new DigitalHuman({
      name,
      description: description || '',
      avatar: mainAvatar,
      references: refArray,
      config: config || {},
      status: status || 'active',
      aiModelId: aiModelId || null,
      createdBy: req.user._id
    });

    await newDigitalHuman.save();

    res.status(201).json({
      success: true,
      data: newDigitalHuman,
      message: '数字人创建成功'
    });
  } catch (error) {
    console.error('数字人创建失败:', error);
    res.status(500).json({
      success: false,
      message: '创建数字人失败'
    });
  }
});

// 更新数字人
router.put('/:id', authenticate, authorize('system:write'), async (req, res) => {
  try {
    const { name, description, avatar, references, config, status, aiModelId } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    // 处理 references 数组，自动更新 avatar
    if (references !== undefined) {
      const refArray = Array.isArray(references) ? references : (references ? [references] : []);
      updateData.references = refArray;
      // 如果没有单独设置 avatar，自动取 references[0]
      if (avatar === undefined && refArray.length > 0) {
        updateData.avatar = refArray[0];
      } else if (refArray.length === 0) {
        updateData.avatar = '';
      }
    }
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;
    if (aiModelId !== undefined) {
      if (aiModelId) {
        const aiModel = await AiModel.findById(aiModelId);
        if (!aiModel) {
          return res.status(400).json({
            success: false,
            message: '关联的AI模型不存在'
          });
        }
        updateData.aiModelId = aiModelId;
      } else {
        updateData.aiModelId = null;
      }
    }

    const updatedDigitalHuman = await DigitalHuman.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username realName').populate('aiModelId', 'name type provider');

    if (!updatedDigitalHuman) {
      return res.status(404).json({
        success: false,
        message: '数字人不存在'
      });
    }

    res.json({
      success: true,
      data: updatedDigitalHuman,
      message: '数字人更新成功'
    });
  } catch (error) {
    console.error('数字人更新失败:', error);
    res.status(500).json({
      success: false,
      message: '更新数字人失败'
    });
  }
});

// 删除数字人
router.delete('/:id', authenticate, authorize('system:delete'), async (req, res) => {
  try {
    const deletedDigitalHuman = await DigitalHuman.findByIdAndDelete(req.params.id);
    if (!deletedDigitalHuman) {
      return res.status(404).json({
        success: false,
        message: '数字人不存在'
      });
    }
    res.json({
      success: true,
      message: '数字人删除成功'
    });
  } catch (error) {
    console.error('数字人删除失败:', error);
    res.status(500).json({
      success: false,
      message: '删除数字人失败'
    });
  }
});

// 获取活跃数字人列表（用于工作区选择）
router.get('/active/list', authenticate, async (req, res) => {
  try {
    const digitalHumans = await DigitalHuman.find({ status: 'active' })
      .select('_id name avatar references description config aiModelId')
      .populate('aiModelId', 'name type')
      .sort({ name: 1 })
      .lean();
    res.json({
      success: true,
      data: digitalHumans
    });
  } catch (error) {
    console.error('获取活跃数字人列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃数字人列表失败'
    });
  }
});

module.exports = router;