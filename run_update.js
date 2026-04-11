const updates = require("/tmp/sample_updates.json");
let updated = 0;
let notFound = 0;
updates.forEach(item => {
  const query = {
    date: { $regex: item.date },
    productId: item.productId,
    influencerAccount: item.influencerAccount
  };
  const result = db.samplemanagements.updateOne(query, { $set: { sampleStatus: "refused" } });
  if (result.modifiedCount > 0) {
    updated++;
  } else {
    notFound++;
  }
});
print("更新完成: " + updated + "条");
print("未找到匹配: " + notFound + "条");
