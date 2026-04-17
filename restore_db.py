#!/usr/bin/env python3
"""从JSON备份文件恢复MongoDB数据"""

import re
import json
import sys
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

MONGODB_URI = 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system'
BACKUP_FILE = '/Users/mor/CodeBuddy/LazyFirst/tapdb_sync/upd202604081635all.json'
DROP_COLLECTIONS = True

def parse_document(doc_str):
    """解析单个JSON文档"""
    # 转换ObjectId和ISODate为特殊标记
    converted = re.sub(r"ObjectId\(['\"]([^'\"]+)['\"]\)", r'{"__oid__":"\1"}', doc_str)
    converted = re.sub(r"ISODate\(['\"]([^'\"]+)['\"]\)", r'{"__date__":"\1"}', converted)
    
    try:
        doc = json.loads(converted)
        
        # 转换回ObjectId
        def fix_oids(obj):
            if isinstance(obj, dict):
                if '__oid__' in obj:
                    return ObjectId(obj['__oid__'])
                if '__date__' in obj:
                    try:
                        return datetime.fromisoformat(obj['__date__'].replace('Z', '+00:00'))
                    except:
                        return obj['__date__']
                return {k: fix_oids(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [fix_oids(v) for v in obj]
            return obj
        
        return fix_oids(doc)
    except json.JSONDecodeError as e:
        print(f"    JSON解析错误: {e}")
        return None

def main():
    print(f"读取备份文件: {BACKUP_FILE}")
    
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 按集合分割
    sections = re.split(r'===COLLECTION:', content)
    
    client = MongoClient(MONGODB_URI)
    db = client['tap_system']
    
    total_docs = 0
    
    for section in sections:
        if not section.strip():
            continue
        
        lines = section.strip().split('\n')
        coll_name = lines[0].replace('===', '').strip()
        
        if not coll_name or len(lines) < 2:
            continue
        
        # 跳过空行
        doc_lines = []
        for line in lines[1:]:
            stripped = line.strip()
            if stripped:
                doc_lines.append(stripped)
        
        if not doc_lines:
            continue
        
        # 合并所有行
        full_text = '\n'.join(doc_lines)
        
        # 分割独立JSON对象
        docs = []
        bracket_count = 0
        current_doc = []
        in_string = False
        escape_next = False
        
        for char in full_text:
            if escape_next:
                current_doc.append(char)
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                current_doc.append(char)
                continue
            
            if char == '"':
                in_string = not in_string
                current_doc.append(char)
                continue
            
            if not in_string:
                if char == '{':
                    bracket_count += 1
                elif char == '}':
                    bracket_count -= 1
            
            current_doc.append(char)
            
            if bracket_count == 0 and current_doc:
                doc_str = ''.join(current_doc).strip()
                if doc_str.startswith('{') and doc_str.endswith('}'):
                    parsed = parse_document(doc_str)
                    if parsed and '_id' in parsed:
                        docs.append(parsed)
                    current_doc = []
        
        if len(docs) == 0:
            continue
        
        print(f"\n集合: {coll_name} ({len(docs)} 条记录)")
        
        try:
            coll = db[coll_name]
            
            if DROP_COLLECTIONS:
                try:
                    coll.drop()
                    print(f"  ✓ 已清空集合")
                except Exception as e:
                    print(f"  ○ 集合不存在或无法删除: {e}")
            
            result = coll.insert_many(docs, ordered=False)
            inserted = len(result.inserted_ids)
            total_docs += inserted
            print(f"  ✓ 已插入 {inserted} 条")
            
        except Exception as e:
            print(f"  ✗ 错误: {e}")
            if hasattr(e, 'details') and e.details:
                print(f"    部分插入: {len(e.details.get('insertedIds', []))} 条")
    
    print(f"\n========== 恢复完成 ==========")
    print(f"合计: {total_docs} 条记录")
    
    print("\n验证:")
    for name in db.list_collection_names():
        count = db[name].count_documents({})
        if count > 0:
            print(f"  {name}: {count} 条")
    
    client.close()

if __name__ == '__main__':
    main()
