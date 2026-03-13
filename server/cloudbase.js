// CloudBase 云函数入口

const tcb = require('tcb-admin-node');

// 初始化CloudBase
tcb.init({
  env: process.env.CLOUDBASE_ENV_ID,
  credentials: {
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY
  }
});

const db = tcb.database();

exports.main = async (event) => {
  try {
    const { action, data } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getInfluencers':
        return await getInfluencers(data);
      case 'createInfluencer':
        return await createInfluencer(data);
      case 'assignInfluencer':
        return await assignInfluencer(data);
      case 'getSamples':
        return await getSamples(data);
      case 'createSample':
        return await createSample(data);
      // 添加更多actions...
      default:
        return {
          success: false,
          message: 'Unknown action'
        };
    }
  } catch (error) {
    console.error('CloudBase function error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// 达人列表
async function getInfluencers(params) {
  const { page = 1, limit = 10, companyId } = params;

  const result = await db.collection('influencers')
    .where({ companyId })
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  return {
    success: true,
    data: {
      influencers: result.data,
      pagination: {
        page,
        limit,
        total: result.data.length
      }
    }
  };
}

// 创建达人
async function createInfluencer(data) {
  const result = await db.collection('influencers').add({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    success: true,
    data: { influencer: result.data }
  };
}

// 分配达人
async function assignInfluencer({ influencerId, assignedTo }) {
  const result = await db.collection('influencers')
    .doc(influencerId)
    .update({
      'crmInfo.assignedTo': assignedTo,
      'crmInfo.poolType': 'private',
      'crmInfo.assignedAt': new Date(),
      updatedAt: new Date()
    });

  return {
    success: true,
    message: '分配成功'
  };
}

// 样品列表
async function getSamples(params) {
  const { page = 1, limit = 10, companyId } = params;

  const result = await db.collection('sampleRequests')
    .where({ companyId })
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  return {
    success: true,
    data: {
      samples: result.data,
      pagination: {
        page,
        limit,
        total: result.data.length
      }
    }
  };
}

// 创建样品申请
async function createSample(data) {
  const result = await db.collection('sampleRequests').add({
    ...data,
    tiktokSync: { isSynced: false },
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    success: true,
    data: { sample: result.data }
  };
}
