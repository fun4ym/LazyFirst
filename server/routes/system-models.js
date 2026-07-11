const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * 将 Mongoose SchemaType 转为可读类型名
 */
function getTypeName(schemaType) {
  if (!schemaType) return 'Mixed';
  const instance = schemaType.instance;
  const map = {
    'String': 'String',
    'Number': 'Number',
    'Date': 'Date',
    'Boolean': 'Boolean',
    'ObjectID': 'ObjectId',
    'Array': 'Array',
    'Map': 'Map',
    'Buffer': 'Buffer',
    'Mixed': 'Mixed'
  };
  return map[instance] || instance || 'Mixed';
}

/**
 * 从单个 SchemaType 提取字段信息
 */
function extractFieldInfo(schemaType, path) {
  const options = schemaType.options || {};
  const ref = options.ref || null;

  // 如果是数组类型且元素有 ref，取元素 ref
  let actualRef = ref;
  if (!actualRef && schemaType.instance === 'Array' && Array.isArray(options.type) && options.type[0] && options.type[0].ref) {
    actualRef = options.type[0].ref;
  }

  // 枚举值
  let enumValues = null;
  if (options.enum) {
    if (Array.isArray(options.enum)) {
      enumValues = options.enum;
    } else if (options.enum.values && Array.isArray(options.enum.values)) {
      enumValues = options.enum.values;
    }
  }

  // 生成默认值显示
  let defaultDisplay = null;
  if (options.default !== undefined) {
    if (typeof options.default === 'function') {
      // 函数类型默认值（如 Date.now），尝试获取调用结果
      try {
        defaultDisplay = String(options.default());
      } catch (e) {
        defaultDisplay = '(函数)';
      }
    } else if (options.default === null) {
      defaultDisplay = 'null';
    } else if (options.default === '') {
      defaultDisplay = "''";
    } else {
      defaultDisplay = String(options.default);
    }
  }

  return {
    field: path,
    type: getTypeName(schemaType),
    required: options.required === true,
    ref: actualRef,
    default: defaultDisplay,
    enum: enumValues,
    description: '' // Mongoose schema 注释 运行时不可获取，由前端自行补充
  };
}

/**
 * 从一个模型中提取所有字段（含子文档嵌套路径）
 */
function extractFields(model) {
  const schema = model.schema;
  const fields = [];
  const seenPaths = new Set();

  // 遍历所有 paths（Mongoose 已展开子文档路径）
  for (const [path, schemaType] of Object.entries(schema.paths)) {
    if (path === '__v') continue;
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);
    fields.push(extractFieldInfo(schemaType, path));
  }

  // 补充 subdocument 中的 path（避免某些版本遗漏）
  if (schema._subDocuments) {
    for (const [subPath, subSchema] of Object.entries(schema._subDocuments)) {
      for (const [fieldPath, fieldType] of Object.entries(subSchema.paths)) {
        const fullPath = `${subPath}.${fieldPath}`;
        if (fieldPath === '__v' || seenPaths.has(fullPath)) continue;
        seenPaths.add(fullPath);
        const info = extractFieldInfo(fieldType, fieldPath);
        info.field = fullPath;
        fields.push(info);
      }
    }
  }

  return fields;
}

/**
 * 从一个模型中提取外键关系
 */
function extractRelations(model) {
  const schema = model.schema;
  const relations = [];
  const modelName = model.modelName;

  for (const [path, schemaType] of Object.entries(schema.paths)) {
    if (path === '_id' || path === '__v') continue;

    const options = schemaType.options || {};
    let ref = options.ref;

    // 数组类型引用：如 [{ type: ObjectId, ref: 'Product' }]
    if (!ref && schemaType.instance === 'Array' && Array.isArray(options.type) && options.type[0] && options.type[0].ref) {
      ref = options.type[0].ref;
    }

    if (ref) {
      relations.push({
        sourceTable: modelName,
        sourceField: path,
        targetTable: ref,
        targetField: '_id',
        type: 'FK',
        description: `${modelName}.${path} → ${ref}._id`
      });
    }
  }

  return relations;
}

/**
 * @route   GET /api/system-models
 * @desc    获取所有 Mongoose 模型的结构与主外键关系
 * @access  Private (需 systemModels:read)
 */
router.get('/', authenticate, authorize('systemModels:read'), async (req, res) => {
  try {
    const modelNames = mongoose.modelNames();
    const tables = [];
    const relations = [];

    for (const name of modelNames) {
      try {
        const model = mongoose.model(name);
        const schema = model.schema;

        // 取 collection 名作为描述
        const collectionName = schema.get('collection') || name.toLowerCase() + 's';

        const tableInfo = {
          name,
          description: `集合: ${collectionName}`,
          fields: extractFields(model)
        };
        tables.push(tableInfo);

        relations.push(...extractRelations(model));
      } catch (innerErr) {
        console.error(`处理模型 ${name} 失败:`, innerErr.message);
      }
    }

    // 排序
    tables.sort((a, b) => a.name.localeCompare(b.name));
    relations.sort((a, b) => a.sourceTable.localeCompare(b.sourceTable) || a.sourceField.localeCompare(b.sourceField));

    res.json({
      success: true,
      data: {
        tables,
        relations
      }
    });
  } catch (error) {
    console.error('获取系统模型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统模型失败: ' + error.message
    });
  }
});

module.exports = router;
