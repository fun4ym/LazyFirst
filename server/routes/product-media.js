const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

// 配置multer上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/product-media/';
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (file.fieldname === 'image') {
    if (allowedImageTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式：jpeg, jpg, png, gif, webp'), false);
    }
  } else if (file.fieldname === 'video') {
    if (allowedVideoTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('只支持视频格式：mp4, mov, avi, mkv, webm'), false);
    }
  } else {
    cb(new Error('未知文件类型'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter
});

// 获取产品的媒体文件列表
router.get('/:productId/media', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .select('mediaFiles')
      .lean();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    res.json({
      success: true,
      data: product.mediaFiles || []
    });
  } catch (error) {
    console.error('获取产品媒体文件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品媒体文件失败'
    });
  }
});

// 上传媒体文件到产品
router.post('/:productId/media', 
  authenticate, 
  authorize('products:write'),
  upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'video', maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        // 删除已上传的文件
        if (req.files) {
          Object.values(req.files).forEach(files => {
            files.forEach(file => {
              fs.unlinkSync(file.path);
            });
          });
        }
        return res.status(404).json({
          success: false,
          message: '产品不存在'
        });
      }

      const mediaFiles = [];
      const baseUrl = `${req.protocol}://${req.get('host')}/`;

      // 处理图片文件
      if (req.files.image) {
        req.files.image.forEach(file => {
          mediaFiles.push({
            type: 'image',
            url: baseUrl + file.path.replace(/\\/g, '/'),
            thumbnail: baseUrl + file.path.replace(/\\/g, '/'), // 图片缩略图同原图
            title: file.originalname,
            fileSize: file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            order: product.mediaFiles.length + mediaFiles.length
          });
        });
      }

      // 处理视频文件
      if (req.files.video) {
        req.files.video.forEach(file => {
          mediaFiles.push({
            type: 'video',
            url: baseUrl + file.path.replace(/\\/g, '/'),
            thumbnail: '', // 视频缩略图需要额外生成，暂时留空
            title: file.originalname,
            fileSize: file.size,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            order: product.mediaFiles.length + mediaFiles.length
          });
        });
      }

      // 如果没有上传任何文件
      if (mediaFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: '未上传任何文件'
        });
      }

      // 添加到产品的mediaFiles数组
      product.mediaFiles.push(...mediaFiles);
      await product.save();

      res.status(201).json({
        success: true,
        data: mediaFiles,
        message: `成功上传 ${mediaFiles.length} 个文件`
      });
    } catch (error) {
      console.error('上传媒体文件失败:', error);
      // 删除已上传的文件
      if (req.files) {
        Object.values(req.files).forEach(files => {
          files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        });
      }
      res.status(500).json({
        success: false,
        message: '上传媒体文件失败'
      });
    }
  }
);

// 删除产品的媒体文件
router.delete('/:productId/media/:mediaId', authenticate, authorize('products:write'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    const mediaIndex = product.mediaFiles.findIndex(
      media => media._id.toString() === req.params.mediaId
    );

    if (mediaIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '媒体文件不存在'
      });
    }

    const mediaFile = product.mediaFiles[mediaIndex];
    // 从文件系统中删除文件
    if (mediaFile.url) {
      const filePath = mediaFile.url.replace(`${req.protocol}://${req.get('host')}/`, '');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 从数组中移除
    product.mediaFiles.splice(mediaIndex, 1);
    await product.save();

    res.json({
      success: true,
      message: '媒体文件删除成功'
    });
  } catch (error) {
    console.error('删除媒体文件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除媒体文件失败'
    });
  }
});

// 更新媒体文件信息（标题、描述、排序等）
router.put('/:productId/media/:mediaId', authenticate, authorize('products:write'), async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    const mediaFile = product.mediaFiles.id(req.params.mediaId);
    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: '媒体文件不存在'
      });
    }

    if (title !== undefined) mediaFile.title = title;
    if (description !== undefined) mediaFile.description = description;
    if (order !== undefined) mediaFile.order = order;

    await product.save();

    res.json({
      success: true,
      data: mediaFile,
      message: '媒体文件更新成功'
    });
  } catch (error) {
    console.error('更新媒体文件失败:', error);
    res.status(500).json({
      success: false,
      message: '更新媒体文件失败'
    });
  }
});

module.exports = router;