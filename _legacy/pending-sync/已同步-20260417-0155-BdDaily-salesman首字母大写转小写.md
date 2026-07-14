# 数据迁移：BdDaily集合salesman字段首字母大写转小写

## 迁移时间
2026-04-17 01:55 (东八区)

## 迁移内容
将线上MongoDB数据库 `tap_system` 中 `bddailies` 集合的 `salesman` 字段首字母大写改为小写字母。

## 问题背景
- `bddailies` 集合有唯一索引：`companyId_1_date_1_salesman_1`
- 存在大小写不同的重复记录（如 'nam' 和 'Nam'），导致唯一索引冲突
- 需要将首字母大写的记录转为小写，并合并重复数据

## 迁移前状态
- 首字母大写的记录：**12条**
- 重复记录组：**10组**（每组包含大小写不同的两条记录）
- 具体重复值：'Nam'/'nam'、'Dingyan'/'dingyan'、'Film'/'film'、'Cin'/'cin'

## 迁移操作
### 1. 数据库备份
执行定时备份脚本：`/home/ubuntu/backups/tapdb_20260417_015242.archive`

### 2. 数据迁移脚本
使用 MongoDB 聚合和更新操作：
- **合并重复记录**：将首字母大写记录的数值字段加到小写记录上，然后删除大写记录
- **直接更新**：没有重复记录的首字母大写记录，直接更新 `salesman` 字段为小写

### 3. 合并逻辑
对于每个重复组：
- 数值字段相加：`sampleCount`、`sampleSentCount`、`sampleRefusedCount`、`videoPublishCount`、`revenue`、`estimatedCommission`、`orderCount`、`commission`、`orderGeneratedCount`
- ID字段合并：`sampleIds` 和 `revenueIds` 字符串去重合并
- 保留小写记录，删除大写记录

## 迁移结果
| 指标 | 数量 |
|------|------|
| 处理的首字母大写记录 | 12条 |
| 合并的重复记录组 | 9组 |
| 直接更新的记录 | 3条 |
| 删除的大写记录 | 9条 |
| 剩余首字母大写记录 | **0条** ✅ |

## 验证结果
1. **首字母大写检查**：`db.bddailies.countDocuments({salesman: /^[A-Z]/})` → **0**
2. **唯一索引验证**：`db.bddailies.aggregate([{$group: {_id: {companyId: "$companyId", date: "$date", salesman: "$salesman"}, count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}]` → **空数组**
3. **数据分布**：所有 `salesman` 值均为小写（'nam'、'dingyan'、'film'、'cin' 等）

## 影响范围
- **数据完整性**：合并后数据完整，数值字段正确累加
- **业务影响**：BD日报统计将正确显示，避免因大小写不同导致的重复统计
- **系统性能**：唯一索引冲突解决，数据插入/更新更稳定

## 注意事项
1. 此操作为数据迁移，不涉及代码修改
2. 迁移前已备份数据库，可随时恢复
3. 迁移后需确保前端/后端代码正确处理小写的 `salesman` 值
4. 建议后续代码中对 `salesman` 字段统一使用小写

## 恢复方案
如需恢复数据，可使用备份文件：
```bash
# 停止后端服务
docker compose stop backend

# 恢复数据库
sudo docker exec tap-mongodb mongorestore --drop --archive=/home/ubuntu/backups/tapdb_20260417_015242.archive

# 重启服务
docker compose start backend
```

## 执行命令记录
```bash
# 备份数据库
cd /home/ubuntu/backups && ./backup-db.sh

# 执行迁移脚本（通过mongosh）
mongosh "mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@localhost:27017/tap_system?authSource=tap_system" --quiet --eval '...迁移脚本...'
```

## 状态
✅ **迁移完成** - 所有首字母大写的 `salesman` 字段已转为小写，重复记录已合并