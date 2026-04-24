const router = require('express').Router();
const Supplier = require('../models/Supplier');
const { authenticate, authorize } = require('../middleware/auth');

// 获取供应商列表
router.get('/', authenticate, authorize('suppliers:read'), async (req, res) => {
  try {
    const { companyId, name, type, contact, phone, keyword, page = 1, limit = 20 } = req.query;

    const query = {};

    // 公司隔离
    if (companyId && companyId.trim()) {
      query.companyId = companyId;
    } else {
      // 如果没有提供companyId，使用用户所属公司
      query.companyId = req.user.companyId;
    }

    // 精确搜索
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (type) {
      query.type = type;
    }
    if (contact) {
      query.contact = { $regex: contact, $options: 'i' };
    }
    if (phone) {
      query.phone = { $regex: phone, $options: 'i' };
    }

    // 关键字模糊搜索（跨多个字段）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { contact: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const suppliers = await Supplier.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Supplier.countDocuments(query);

    res.json({
      success: true,
      suppliers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    res.status(500).json({ success: false, message: '获取供应商列表失败' });
  }
});

// 获取供应商详情
router.get('/:id', authenticate, authorize('suppliers:read'), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 检查权限：只能查看自己公司的供应商
    if (supplier.companyId.toString() !== req.user.companyId.toString() && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: '无权访问该供应商' });
    }

    res.json({
      success: true,
      supplier
    });
  } catch (error) {
    console.error('获取供应商详情失败:', error);
    res.status(500).json({ success: false, message: '获取供应商详情失败' });
  }
});

// 创建供应商
router.post('/', authenticate, authorize('suppliers:create'), async (req, res) => {
  try {
    const { name, type, contact, phone, email, address, remarks } = req.body;
    const companyId = req.user.companyId;

    // 验证必填字段
    if (!name || !type || !contact || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: '供应商名称、类型、联系人和电话为必填项' 
      });
    }

    // 检查同公司下是否存在同名供应商
    const existing = await Supplier.findOne({ companyId, name });
    if (existing) {
      return res.status(400).json({ success: false, message: '该供应商名称已存在' });
    }

    const supplier = new Supplier({
      companyId,
      name,
      type,
      contact,
      phone,
      email: email || '',
      address: address || '',
      remarks: remarks || ''
    });

    await supplier.save();

    res.json({ success: true, supplier });
  } catch (error) {
    console.error('创建供应商失败:', error);
    res.status(500).json({ success: false, message: '创建供应商失败' });
  }
});

// 更新供应商
router.put('/:id', authenticate, authorize('suppliers:update'), async (req, res) => {
  try {
    const { name, type, contact, phone, email, address, remarks } = req.body;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 检查权限：只能更新自己公司的供应商
    if (supplier.companyId.toString() !== req.user.companyId.toString() && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: '无权更新该供应商' });
    }

    // 检查名称是否已被其他供应商使用
    if (name && name !== supplier.name) {
      const existing = await Supplier.findOne({
        _id: { $ne: supplier._id },
        companyId: supplier.companyId,
        name
      });
      if (existing) {
        return res.status(400).json({ success: false, message: '该供应商名称已被使用' });
      }
    }

    // 更新字段
    supplier.name = name || supplier.name;
    supplier.type = type || supplier.type;
    supplier.contact = contact || supplier.contact;
    supplier.phone = phone || supplier.phone;
    supplier.email = email !== undefined ? email : supplier.email;
    supplier.address = address !== undefined ? address : supplier.address;
    supplier.remarks = remarks !== undefined ? remarks : supplier.remarks;

    await supplier.save();

    res.json({ success: true, supplier });
  } catch (error) {
    console.error('更新供应商失败:', error);
    res.status(500).json({ success: false, message: '更新供应商失败' });
  }
});

// 删除供应商
router.delete('/:id', authenticate, authorize('suppliers:delete'), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 检查权限：只能删除自己公司的供应商
    if (supplier.companyId.toString() !== req.user.companyId.toString() && !req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: '无权删除该供应商' });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除供应商失败:', error);
    res.status(500).json({ success: false, message: '删除供应商失败' });
  }
});

module.exports = router;