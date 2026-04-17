import pandas as pd
from pymongo import MongoClient

# 连接线上MongoDB
client = MongoClient('mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system')
db = client.tap_system

# 读取Excel
df = pd.read_excel('/Users/mor/Downloads/sample_1775878382089.xlsx')

# 筛选"是否寄样"为"否"的行
no_df = df[df['是否寄样'] == '否']

print(f"Excel中'是否寄样'为'否'的记录数: {len(no_df)}")

# 匹配并更新
updated_count = 0
not_found_count = 0

for idx, row in no_df.iterrows():
    date_val = row['日期']
    product_id = str(row['商品ID'])
    influencer_account = row['达人账号']

    # 处理日期格式
    if pd.notna(date_val):
        if isinstance(date_val, str):
            date_str = date_val[:10]
        else:
            date_str = date_val.strftime('%Y-%m-%d')
    else:
        continue

    # 查询匹配（用正则匹配日期）
    query = {
        'date': {'$regex': date_str},
        'productId': product_id,
        'influencerAccount': influencer_account
    }

    sample = db.samplemanagements.find_one(query)

    if sample:
        result = db.samplemanagements.update_one(
            {'_id': sample['_id']},
            {'$set': {'sampleStatus': 'refused'}}
        )
        if result.modified_count > 0:
            updated_count += 1
        if updated_count <= 10:
            print(f"  更新: {date_str} | {product_id} | {influencer_account} -> refused")
    else:
        not_found_count += 1

print(f"\n更新完成: {updated_count}条")
print(f"未找到匹配: {not_found_count}条")

client.close()
