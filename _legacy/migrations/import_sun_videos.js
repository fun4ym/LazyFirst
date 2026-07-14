/**
 * 导入 sun.xlsx 中的视频数据
 * 匹配规则：
 *   excel.日期 == SampleManagement.date
 *   excel.商品ID == SampleManagement.productId (TikTok商品ID字符串)
 *   excel.达人账号 == Influencer.tiktokId -> SampleManagement.influencerId
 *   SampleManagement.salesmanId == sun用户_id
 * 然后创建Video记录
 * 
 * 运行方式：node import_sun_videos.js
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

// 模型
const SampleManagement = require('./models/SampleManagement');
const Video = require('./models/Video');
const Influencer = require('./models/Influencer');
const Product = require('./models/Product');
const User = require('./models/User');

// 常量
const DEFAULT_COMPANY_ID = '69a7aad8da66cd5145a5f06f';
const EXCEL_PATH = '/Users/mor/Downloads/sun.xlsx';

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';
    console.log(`连接数据库: ${uri}`);
    await mongoose.connect(uri);
    console.log('✅ 数据库连接成功');
}

async function disconnectDB() {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
}

/**
 * 查找sun用户（username为sun或realName包含孙）
 */
async function findSunUser() {
    const user = await User.findOne({
        $or: [
            { username: 'sun' },
            { realName: /孙/ }
        ]
    });
    if (!user) {
        throw new Error('未找到sun用户，请确保存在username为sun或realName包含"孙"的用户');
    }
    console.log(`找到sun用户: ${user.realName} (${user.username}), _id: ${user._id}`);
    return user;
}

/**
 * 将Excel日期字符串转换为Date对象
 * 支持格式: YYYY-MM-DD
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    // 如果是Excel数字序列，这里暂不处理
    if (typeof dateStr === 'number') {
        // Excel日期序列 (从1899-12-30开始)
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + dateStr * 86400000);
    }
    // 字符串格式
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        console.warn(`无法解析日期: ${dateStr}`);
        return null;
    }
    // 设置为当天的开始时间
    date.setHours(0, 0, 0, 0);
    return date;
}

async function importVideos() {
    console.log('=== 开始导入sun的视频数据 ===');
    await connectDB();

    // 1. 查找sun用户
    const sunUser = await findSunUser();
    const sunUserId = sunUser._id;
    const companyId = sunUser.companyId || new mongoose.Types.ObjectId(DEFAULT_COMPANY_ID);

    // 2. 读取Excel
    console.log(`读取Excel文件: ${EXCEL_PATH}`);
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    console.log(`共读取 ${rows.length} 行数据`);

    if (rows.length === 0) {
        console.log('Excel中没有数据');
        return;
    }

    // 3. 统计
    let processed = 0;
    let matched = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    // 4. 批量处理
    for (const row of rows) {
        processed++;
        const dateStr = row['日期'];
        const productId = row['商品ID'];
        const influencerAccount = row['达人账号'];
        const videoLink = row['达人视频链接'];
        const videoStreamCode = row['视频推流码'];

        if (!dateStr || !productId || !influencerAccount || !videoLink) {
            console.warn(`第 ${processed} 行缺少必要字段，跳过`);
            skipped++;
            continue;
        }

        // 解析日期
        const date = parseDate(dateStr);
        if (!date) {
            console.warn(`第 ${processed} 行日期无效: ${dateStr}`);
            skipped++;
            continue;
        }

        try {
            // 5. 查找Influencer
            const influencer = await Influencer.findOne({
                companyId: companyId,
                tiktokId: influencerAccount
            });
            if (!influencer) {
                console.warn(`第 ${processed} 行未找到达人账号 "${influencerAccount}" 对应的Influencer记录，跳过`);
                skipped++;
                continue;
            }

            // 6. 查找SampleManagement
            const sample = await SampleManagement.findOne({
                companyId: companyId,
                date: date,
                productId: productId,
                influencerId: influencer._id,
                salesmanId: sunUserId
            });
            if (!sample) {
                console.warn(`第 ${processed} 行未匹配到SampleManagement记录，条件: date=${dateStr}, productId=${productId}, influencerId=${influencer._id}, salesmanId=${sunUserId}`);
                skipped++;
                continue;
            }
            matched++;

            // 7. 查找Product（通过tiktokProductId）
            let product = null;
            if (productId) {
                product = await Product.findOne({
                    companyId: companyId,
                    tiktokProductId: productId
                });
                if (!product) {
                    console.warn(`未找到商品ID "${productId}" 对应的Product记录，Video.productId将设为null`);
                }
            }

            // 8. 检查Video是否已存在（避免重复）
            const existingVideo = await Video.findOne({
                companyId: companyId,
                sampleId: sample._id,
                videoLink: videoLink
            });
            if (existingVideo) {
                console.log(`第 ${processed} 行Video已存在，跳过`);
                skipped++;
                continue;
            }

            // 9. 创建Video记录
            const videoData = {
                companyId: companyId,
                sampleId: sample._id,
                productId: product ? product._id : null,
                tiktokProductId: productId,
                influencerId: influencer._id,
                videoLink: videoLink,
                videoStreamCode: videoStreamCode || '',
                createdBy: sunUserId
            };

            const video = new Video(videoData);
            await video.save();
            created++;
            console.log(`✅ 创建Video: sampleId=${sample._id}, videoLink=${videoLink.substring(0, 50)}...`);
        } catch (err) {
            console.error(`第 ${processed} 行处理错误:`, err.message);
            errors++;
        }
    }

    // 10. 输出统计
    console.log('\n=== 导入完成 ===');
    console.log(`处理行数: ${processed}`);
    console.log(`匹配SampleManagement: ${matched}`);
    console.log(`创建Video记录: ${created}`);
    console.log(`跳过行数: ${skipped}`);
    console.log(`错误行数: ${errors}`);

    await disconnectDB();
}

// 执行
importVideos().catch(err => {
    console.error('导入失败:', err);
    process.exit(1);
});