import pandas as pd
from pymongo import MongoClient
from bson import ObjectId

# 连接本地MongoDB
client = MongoClient('mongodb://127.0.0.1:27017/tap_system')
db = client.tap_system

# 读取Excel
df = pd.read_excel('/Users/mor/Downloads/sample_1775878382089.xlsx')

# 筛选"是否寄样"为空的行
empty_df = df[df['是否寄样'].isna()]

print(f"Excel中'是否寄样'为空的记录数: {len(empty_df)}")

# 匹配并更新
updated_count = 0
not_found_count = 0

for idx, row in empty_df.iterrows():
    date_val = row['日期']
    product_id = str(row['商品ID'])
    influencer_account = row['达人账号']

    # 处理日期格式
    if pd.notna(date_val):
        if isinstance(date_val, str):
            date_str = date_val
        else:
            date_str = date_val.strftime('%Y-%m-%d')
    else:
        continue

    # 查询匹配
    query = {
        'date': {'$regex': date_str[:10]},
        'productId': product_id,
        'influencerAccount': influencer_account
    }

    sample = db.samplemanagements.find_one(query)

    if sample:
        result = db.samplemanagements.update_one(
            {'_id': sample['_id']},
            {'$set': {'sampleStatus': 'pending'}}
        )
        if result.modified_count > 0:
            updated_count += 1
        print(f"  更新: {date_str[:10]} | {product_id} | {influencer_account} -> pending")
    else:
        not_found_count += 1
        print(f"  未找到: {date_str[:10]} | {product_id} | {influencer_account}")

print(f"\n更新完成: {updated_count}条")
print(f"未找到匹配: {not_found_count}条")

client.close()
