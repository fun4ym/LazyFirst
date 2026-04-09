#!/bin/bash
# MongoDB 添加用户认证
# 使用方法: docker exec tap-mongodb mongosh admin < /path/to/migrate_add_auth.js

print("=== 开始添加 MongoDB 用户认证 ===");

// 创建管理员用户
try {
  db.createUser({
    user: "tapadmin",
    pwd: "tap_admin_pass_2024",
    roles: [
      { role: "userAdminAnyDatabase", db: "admin" },
      { role: "readWriteAnyDatabase", db: "admin" },
      { role: "dbAdminAnyDatabase", db: "admin" }
    ]
  });
  print("✅ 管理员用户创建成功");
} catch (e) {
  if (e.message.includes("already exists")) {
    print("ℹ️  管理员用户已存在，跳过");
  } else {
    print("❌ 管理员用户创建失败: " + e.message);
  }
}

// 创建应用用户（针对 tap_system 数据库）
try {
  db.getSiblingDB("tap_system").createUser({
    user: "tapsystem",
    pwd: "tap_system_pass_2024",
    roles: [
      { role: "readWrite", db: "tap_system" }
    ]
  });
  print("✅ 应用用户创建成功 (tap_system)");
} catch (e) {
  if (e.message.includes("already exists")) {
    print("ℹ️  应用用户已存在，跳过");
  } else {
    print("❌ 应用用户创建失败: " + e.message);
  }
}

print("=== 用户认证添加完成 ===");
print("");
print("新的连接字符串:");
print("  mongodb://tapsystem:tap_system_pass_2024@150.109.183.29:27017/tap_system?authSource=tap_system");
