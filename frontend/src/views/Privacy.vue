<template>
  <div class="policy-page">
    <div class="policy-container">
      <div class="language-tabs">
        <el-button
          v-for="lang in languages"
          :key="lang.code"
          :type="currentLang === lang.code ? 'primary' : 'default'"
          @click="currentLang = lang.code"
        >
          {{ lang.name }}
        </el-button>
      </div>

      <div class="policy-content">
        <h1 v-if="currentLang === 'th'">นโยบายความเป็นส่วนตัว</h1>
        <h1 v-else-if="currentLang === 'en'">Privacy Policy</h1>
        <h1 v-else>隐私政策</h1>

        <div class="effective-info">
          <p v-if="currentLang === 'th'"><strong>วันที่มีผลบังคับใช้:</strong> 26 พฤศจิกายน 2568</p>
          <p v-else-if="currentLang === 'en'"><strong>Effective Date:</strong> November 26, 2025</p>
          <p v-else><strong>生效日期:</strong> 2025年11月26日</p>

          <p v-if="currentLang === 'th'"><strong>ขอบเขตการใช้งาน:</strong> ราชอาณาจักรไทย</p>
          <p v-else-if="currentLang === 'en'"><strong>Applicable Jurisdiction:</strong> Kingdom of Thailand</p>
          <p v-else><strong>适用地区:</strong> 泰王国</p>

          <p v-if="currentLang === 'th'"><strong>บริษัท:</strong> บริษัท เลซีเฟิสท์ จำกัด (LazyFirst Co., Ltd.)</p>
          <p v-else-if="currentLang === 'en'"><strong>Company:</strong> LazyFirst Co., Ltd.</p>
          <p v-else><strong>公司:</strong> LazyFirst Co., Ltd.</p>
        </div>

        <!-- Thai Version -->
        <div v-if="currentLang === 'th'" class="content-section">
          <p>นโยบายความเป็นส่วนตัวนี้ถูกจัดทำตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และกฎหมายที่เกี่ยวข้องของราชอาณาจักรไทย เพื่อระบุวิธี การรวบรวม การใช้ การจัดเก็บ การคุ้มครอง และเปิดเผยข้อมูลส่วนบุคคลของผู้ใช้ รวมถึงขอบเขตและวัตถุประสงค์ เพื่อป้องกันสิทธิและความปลอดภัยของข้อมูลส่วนบุคคลของคุณ</p>

          <h2>1. ขอบเขตข้อมูลส่วนบุคคลที่รวบรวม</h2>
          <p>เรารวบรวมข้อมูลส่วนบุคคลที่จำเป็นสำหรับการให้บริการเท่านั้น ไม่รวบรวมข้อมูลที่ไม่เกี่ยวข้องกับบริการ รวมถึง:</p>
          <ul>
            <li>ข้อมูลประจำตัวพื้นฐาน: ชื่อ ข้อมูลติดต่อ (เบอร์โทรศัพท์ อีเมล) ชื่อบริษัท ตำแหน่งงาน</li>
            <li>ข้อมูลเกี่ยวข้องกับบริการ: ข้อมูลลงทะเบียนการเยี่ยมชมของ BD บันทึกการขอสินค้าแสดงตัวอย่าง ข้อมูลลงทะเบียนความประสงค์ความร่วมมือ</li>
            <li>ข้อมูลการใช้งาน: บันทึกการดำเนินการ บันทึกการเข้าถึง</li>
            <li>ข้อมูลส่วนบุคคลอ่อนไหว: เราจะไม่รวบรวมโดย主动 ยกเว้นได้รับความยินยันเป็นลายลักษณ์อักษรจากคุณชัดเจน</li>
          </ul>

          <h2>2. วัตถุประสงค์ในการใช้ข้อมูลส่วนบุคคล</h2>
          <ul>
            <li>ให้บริการและปรับปรุงบริการ</li>
            <li>สื่อสารและแจ้งเตือน</li>
            <li>บำรุงรักษาระบบและความปลอดภัย</li>
            <li>การปฏิบัติตามกฎหมาย</li>
          </ul>

          <h2>3. มาตรการคุ้มครองข้อมูลส่วนบุคคล</h2>
          <ul>
            <li>คุ้มครองด้วยเทคโนโลยี: ใช้เทคโนโลยีเข้ารหัส การควบคุมการเข้าถึง การตรวจสอบความปลอดภัย</li>
            <li>คุ้มครองด้วยการจัดการ: สร้างระบบการจัดการภายในที่เข้มงวด</li>
            <li>คุ้มครองการจัดเก็บ: ข้อมูลจัดเก็บในเซิร์ฟเวอร์ที่สอดคล้องมาตรฐานความปลอดภัย</li>
            <li>การจัดการเหตุฉุกเฉิน: สร้างแผนการจัดการเหตุฉุกเฉินความปลอดภัยข้อมูล</li>
          </ul>

          <h2>4. การเปิดเผยและแชร์ข้อมูลส่วนบุคคล</h2>
          <p>เราจะไม่เปิดเผย ขาย หรือให้เช่า ข้อมูลส่วนบุคคลของคุณโดย随意 จะแชร์ข้อมูลได้เพียงในกรณี:</p>
          <ul>
            <li>ได้รับความยินยันเป็นลายลักษณ์อักษรจากคุณ</li>
            <li>เพื่อปฏิบัติตามกฎหมายของราชอาณาจักรไทย</li>
            <li>แชร์กับบริษัทที่เกี่ยวข้องหรือผู้ให้บริการที่รับมอบงาน</li>
            <li>ประมวลผลข้อมูลให้เป็นข้อมูลที่ไม่สามารถระบุตัวตนได้</li>
          </ul>

          <h2>5. สิทธิของผู้ใช้</h2>
          <ul>
            <li>สิทธิ์ตรวจสอบ</li>
            <li>สิทธิ์แก้ไข</li>
            <li>สิทธิ์ลบ</li>
            <li>สิทธิ์ถอนความยินยัน</li>
            <li>สิทธิ์ร้องเรียน</li>
          </ul>

          <h2>6. การแก้ไขนโยบาย</h2>
          <p>เราสามารถปรับปรุงนโยบายความเป็นส่วนตัวนี้ได้ตลอดเวลา หากคุณใช้บริการของเราต่อเนื่อง จะถือว่าได้ยอมรับนโยบายที่ปรับปรุงแล้ว</p>

          <h2>7. ข้อมูลการติดต่อ</h2>
          <p>ชื่อบริษัท: บริษัท เลซีเฟิสท์ จำกัด (LazyFirst Co., Ltd.)</p>
          <p>อีเมลติดต่อ: mor@lazyfirst.com</p>
          <p>ที่อยู่ติดต่อ: KOOLPUNT VILLE 9, 77/406 Moo 8 Tumbon Ban whan, Amphur Hang Dong, Province of Chiang Mai 50230</p>
        </div>

        <!-- English Version -->
        <div v-if="currentLang === 'en'" class="content-section">
          <p>This Privacy Policy is formulated in accordance with the Personal Data Protection Act (PDPA) of the Kingdom of Thailand (B.E. 2562, i.e. 2019) and relevant laws and regulations. It aims to clarify the methods, scope and purposes of our collection, use, storage, protection and disclosure of your personal data.</p>

          <h2>1. Scope of Collected Personal Data</h2>
          <p>We only collect personal data necessary for providing services:</p>
          <ul>
            <li>Basic identity information: name, contact information (phone, email), company name, position</li>
            <li>Service-related data: BD visit registration, sample application records, cooperation intention registration</li>
            <li>Usage data: operation records, access logs</li>
            <li>Sensitive personal data: we will not actively collect unless we obtain your explicit written consent</li>
          </ul>

          <h2>2. Purposes of Using Personal Data</h2>
          <ul>
            <li>Provide and optimize services</li>
            <li>Communication and notification</li>
            <li>System maintenance and security</li>
            <li>Compliance and legal requirements</li>
          </ul>

          <h2>3. Personal Data Protection Measures</h2>
          <ul>
            <li>Technical protection: encryption technology, access control, security audit</li>
            <li>Management protection: strict internal management systems</li>
            <li>Storage protection: data stored on security-compliant servers</li>
            <li>Emergency handling: data security emergency plan</li>
          </ul>

          <h2>4. Disclosure and Sharing of Personal Data</h2>
          <p>We promise not to arbitrarily disclose, sell or rent your personal data. Sharing is only allowed:</p>
          <ul>
            <li>After obtaining your explicit written consent</li>
            <li>To comply with Thai laws and regulations</li>
            <li>With affiliated companies or service providers</li>
            <li>After anonymizing personal data</li>
          </ul>

          <h2>5. User Rights</h2>
          <ul>
            <li>Right of inquiry</li>
            <li>Right of correction</li>
            <li>Right of deletion</li>
            <li>Right to withdraw consent</li>
            <li>Right of complaint</li>
          </ul>

          <h2>6. Policy Amendments</h2>
          <p>We have the right to revise this Privacy Policy at any time. Continued use of services constitutes acceptance of the revised policy.</p>

          <h2>7. Contact Information</h2>
          <p>Company Name: LazyFirst Co., Ltd.</p>
          <p>Contact Email: mor@lazyfirst.com</p>
          <p>Contact Address: KOOLPUNT VILLE 9, 77/406 Moo 8 Tumbon Ban whan, Amphur Hang Dong, Province of Chiang Mai 50230</p>
        </div>

        <!-- Chinese Version -->
        <div v-if="currentLang === 'zh'" class="content-section">
          <p>本隐私政策依据泰王国《个人数据保护法》（PDPA，佛历2562年，即2019年）及相关法律法规制定，旨在明确我们收集、使用、存储、保护及披露用户个人数据的方式、范围及目的。</p>

          <h2>一、收集的个人数据范围</h2>
          <p>我们仅收集为提供服务所必需的个人数据:</p>
          <ul>
            <li>基本身份信息: 姓名、联系方式（电话、邮箱）、公司名称、职位</li>
            <li>服务相关数据: BD拜访登记信息、样品申请记录、合作意向登记信息</li>
            <li>使用数据: 操作记录、访问日志</li>
            <li>敏感个人数据: 我们不会主动收集，除非获得您的明确书面同意</li>
          </ul>

          <h2>二、个人数据的使用目的</h2>
          <ul>
            <li>提供并优化服务</li>
            <li>沟通与通知</li>
            <li>系统维护与安全</li>
            <li>合规与法律要求</li>
          </ul>

          <h2>三、个人数据的保护措施</h2>
          <ul>
            <li>技术保护: 加密技术、访问控制、安全审计</li>
            <li>管理保护: 严格的内部管理制度</li>
            <li>存储保护: 数据存储于符合安全标准的服务器</li>
            <li>应急处理: 数据安全应急预案</li>
          </ul>

          <h2>四、个人数据的披露与共享</h2>
          <p>我们承诺不随意披露、出售、出租您的个人数据，仅在以下情况可进行共享:</p>
          <ul>
            <li>获得您的明确书面同意后</li>
            <li>为遵守泰王国法律法规</li>
            <li>共享给关联公司或服务外包商</li>
            <li>对个人数据进行匿名化处理后</li>
          </ul>

          <h2>五、用户的权利</h2>
          <ul>
            <li>查询权</li>
            <li>更正权</li>
            <li>删除权</li>
            <li>撤回同意权</li>
            <li>投诉权</li>
          </ul>

          <h2>六、政策修订</h2>
          <p>我们有权根据法律法规更新及业务发展需要，随时修订本隐私政策。继续使用我们的服务即视为接受修订后的政策。</p>

          <h2>七、联系方式</h2>
          <p>公司名称: LazyFirst Co., Ltd.</p>
          <p>联系邮箱: mor@lazyfirst.com</p>
          <p>联系地址: KOOLPUNT VILLE 9, 77/406 Moo 8 Tumbon Ban whan, Amphur Hang Dong, Province of Chiang Mai 50230</p>
        </div>
      </div>

      <div class="back-link">
        <el-button type="primary" @click="goBack">{{ $t('common.back') }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()

const currentLang = ref('th')
const languages = [
  { code: 'th', name: 'ภาษาไทย' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' }
]

const goBack = () => {
  router.push('/login')
}
</script>

<style scoped>
.policy-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #9c4dcc 100%);
  padding: 40px 20px;
}

.policy-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 12px 40px rgba(74, 20, 140, 0.25);
}

.language-tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.policy-content h1 {
  text-align: center;
  color: #4a148c;
  font-size: 28px;
  margin-bottom: 24px;
}

.effective-info {
  background: #f5f0fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 32px;
}

.effective-info p {
  margin: 8px 0;
  color: #333;
}

.content-section h2 {
  color: #4a148c;
  font-size: 20px;
  margin-top: 24px;
  margin-bottom: 12px;
}

.content-section p {
  color: #666;
  line-height: 1.8;
  margin-bottom: 16px;
}

.content-section ul {
  color: #666;
  line-height: 1.8;
  margin-bottom: 16px;
  padding-left: 20px;
}

.content-section li {
  margin-bottom: 8px;
}

.back-link {
  text-align: center;
  margin-top: 40px;
}
</style>
