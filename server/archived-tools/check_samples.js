const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';
    await mongoose.connect(uri);
    const SampleManagement = require('./models/SampleManagement');
    const sunUserId = new mongoose.Types.ObjectId('69a7e2a21cc5e353d382588f');
    const companyId = new mongoose.Types.ObjectId('69a7aad8da66cd5145a5f06f');
    
    // 查找salesmanId为sun的记录
    const samples = await SampleManagement.find({
        companyId: companyId,
        salesmanId: sunUserId
    }).limit(10);
    console.log(`找到 ${samples.length} 条salesmanId为sun的样品记录`);
    samples.forEach(s => {
        console.log(`_id: ${s._id}, date: ${s.date}, productId: ${s.productId}, influencerId: ${s.influencerId}`);
    });
    
    // 检查是否有匹配Excel第一行的记录
    const date = new Date('2026-04-06');
    date.setHours(0,0,0,0);
    const productId = '1731407709064889514';
    const influencer = await mongoose.model('Influencer').findOne({ tiktokId: 'guayjengsimp' });
    if (influencer) {
        console.log(`\n查找匹配: date=${date}, productId=${productId}, influencerId=${influencer._id}, salesmanId=${sunUserId}`);
        const match = await SampleManagement.findOne({
            companyId: companyId,
            date: date,
            productId: productId,
            influencerId: influencer._id,
            salesmanId: sunUserId
        });
        console.log('匹配结果:', match ? '找到' : '未找到');
    }
    
    await mongoose.disconnect();
}
run().catch(console.error);