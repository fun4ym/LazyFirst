const http = require('http');

// 模拟一个登录请求获取token
const loginData = JSON.stringify({
  username: 'admin',
  password: 'ad8889'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success && result.token) {
        console.log('登录成功，token:', result.token.substring(0, 20) + '...');
        testSamplesAPI(result.token);
      } else {
        console.log('登录失败:', result.message);
      }
    } catch (e) {
      console.log('解析响应失败:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(loginData);
req.end();

function testSamplesAPI(token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/samples?influencerAccount=zhobdee&limit=3',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.success) {
          const samples = result.data?.samples || [];
          console.log(`\n找到 ${samples.length} 条记录:`);
          
          samples.forEach((sample, i) => {
            console.log(`\n样本 ${i+1}:`);
            console.log(`  influencerAccount: ${sample.influencerAccount}`);
            console.log(`  productId: ${sample.productId}`);
            console.log(`  date: ${sample.date}`);
            console.log(`  duplicateCount: ${sample.duplicateCount}`);
            console.log(`  previousSubmissions 数量: ${sample.previousSubmissions?.length || 0}`);
            
            if (sample.previousSubmissions && sample.previousSubmissions.length > 0) {
              console.log(`  历史记录 (前2条):`);
              sample.previousSubmissions.slice(0, 2).forEach((sub, j) => {
                console.log(`    ${j+1}. date=${sub.date}, productName=${sub.productName?.substring(0, 20)}..., sampleStatus=${sub.sampleStatus}`);
              });
            }
          });
        } else {
          console.log('API调用失败:', result.message);
        }
      } catch (e) {
        console.log('解析响应失败:', e.message);
        console.log('原始响应:', data);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('请求错误:', e.message);
  });
  
  req.end();
}
