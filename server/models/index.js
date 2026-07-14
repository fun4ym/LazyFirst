// 统一导出全部模型（单一入口）。路由改用 const { X } = require('../models')。
const User = require('./User');
const Company = require('./Company');
const Role = require('./Role');
const Department = require('./Department');
const Influencer = require('./Influencer');
const InfluencerMaintenance = require('./InfluencerMaintenance');
const Product = require('./Product');
const Commission = require('./Commission');
const SampleManagement = require('./SampleManagement');
const Video = require('./Video');
const Shop = require('./Shop');
const ShopContact = require('./ShopContact');
const ShopRating = require('./ShopRating');
const ShopTracking = require('./ShopTracking');
const Supplier = require('./Supplier');
const TiktokExtensionData = require('./TiktokExtensionData');
const Activity = require('./Activity');
const ActivityHistory = require('./ActivityHistory');
const AiModel = require('./AiModel');
const BaseData = require('./BaseData');
const BdDaily = require('./BdDaily');
const Bill = require('./Bill');
const CommissionRule = require('./CommissionRule');
const DigitalHuman = require('./DigitalHuman');
const PageVisit = require('./PageVisit');
const Performance = require('./Performance');
const PointsTransaction = require('./PointsTransaction');
const PromptTemplate = require('./PromptTemplate');
const Recruitment = require('./Recruitment');
const ReportOrder = require('./ReportOrder');
const TempIdMapping = require('./TempIdMapping');
const VideoGenerationTask = require('./VideoGenerationTask');

module.exports = {
  User,
  Company,
  Role,
  Department,
  Influencer,
  InfluencerMaintenance,
  Product,
  Commission,
  SampleManagement,
  Video,
  Shop,
  ShopContact,
  ShopRating,
  ShopTracking,
  Supplier,
  TiktokExtensionData,
  Activity,
  ActivityHistory,
  AiModel,
  BaseData,
  BdDaily,
  Bill,
  CommissionRule,
  DigitalHuman,
  PageVisit,
  Performance,
  PointsTransaction,
  PromptTemplate,
  Recruitment,
  ReportOrder,
  TempIdMapping,
  VideoGenerationTask
};
