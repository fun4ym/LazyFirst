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
        <h1 v-if="currentLang === 'th'">ข้อกำหนดการให้บริการ</h1>
        <h1 v-else-if="currentLang === 'en'">Terms of Service</h1>
        <h1 v-else>服务条款</h1>

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
          <h2>1. เนื้อหาบริการ</h2>
          <p>บริษัท LazyFirst Co., Ltd. เป็นพาร์ทเนอร์ TAP ในประเทศไทยที่ได้รับการรับรองอย่างเป็นทางการจาก TikTok Thailand จัดให้มีระบบการจัดการดิจิทัล การแสดงสินค้าและผู้ค้า จับคู่อินฟลูเอนเซอร์ ลงทะเบียนความร่วมมือ และเสนอราคาตามความต้องการ</p>

          <h2>2. ภาระผูกพันของผู้ใช้</h2>
          <p>ผู้ใช้ต้องให้ข้อมูลที่เป็นความจริง ถูกต้องและครบถ้วน ปฏิบัติตามกฎหมายไทยและข้อกำหนดของแพลตฟอร์ม ห้ามใช้ระบบเพื่อวัตถุประสงค์ที่ผิดกฎหมาย ละเมิดสิทธิ์หรือไม่เหมาะสม</p>

          <h2>3. ค่าบริการและการชำระเงิน</h2>
          <p>ค่าบริการทั้งหมดขึ้นอยู่กับใบเสนอราคาที่ปรับแต่งตามความต้องการ ค่าบริการไม่สามารถขอคืนได้ เว้นแต่มีข้อตกลงอื่นเป็นลายลักษณ์อักษร</p>

          <h2>4. สิทธิ์ทรัพย์สินทางปัญญา</h2>
          <p>ฟังก์ชันระบบ เครื่องหมายการค้า เนื้อหาและสิทธิ์ทรัพย์สินทางปัญญาทั้งหมดเป็นของ LazyFirst Co., Ltd. หากไม่ได้รับอนุญาต จะห้ามคัดลอก จัดจำหน่ายหรือดัดแปลง</p>

          <h2>5. ข้อจำกัดความรับผิด</h2>
          <p>LazyFirst ไม่รับผิดชอบต่อความเสียหายโดยอ้อม รองหรือตามผล สงวนสิทธิ์ในการปรับปรุง บำรุงรักษาหรือระงับบริการชั่วคราวได้</p>

          <h2>6. กฎหมายที่ใช้บังคับ</h2>
          <p>ข้อกำหนดนี้อยู่ภายใต้การคุ้มครองของกฎหมายราชอาณาจักรไทย</p>

          <h2>7. การแก้ไขข้อกำหนด</h2>
          <p>เราสามารถปรับปรุงข้อกำหนดได้ตลอดเวลา การใช้บริการต่อเนื่องถือว่าตกลงยอมรับข้อกำหนดที่แก้ไขแล้ว</p>
        </div>

        <!-- English Version -->
        <div v-if="currentLang === 'en'" class="content-section">
          <h2>1. Services Overview</h2>
          <p>LazyFirst Co., Ltd. is an official certified local TAP partner of TikTok Thailand. We provide digital management system services, product and merchant display, influencer matching, partnership registration, and customized functional pricing solutions.</p>

          <h2>2. User Responsibilities</h2>
          <p>Users shall provide true, accurate and complete information, comply with Thai laws and platform rules, and shall not use the system for illegal, infringing or improper purposes.</p>

          <h2>3. Fees and Payment</h2>
          <p>All service fees are based on customized quotations. Fees are non-refundable unless otherwise agreed in writing.</p>

          <h2>4. Intellectual Property</h2>
          <p>All system functions, trademarks, content and intellectual property rights belong to LazyFirst Co., Ltd. Unauthorized copying, distribution or modification is prohibited.</p>

          <h2>5. Limitation of Liability</h2>
          <p>LazyFirst shall not be liable for indirect, incidental or consequential damages. We reserve the right to adjust, maintain or temporarily suspend services.</p>

          <h2>6. Governing Law</h2>
          <p>These Terms are governed by the laws of the Kingdom of Thailand.</p>

          <h2>7. Amendments</h2>
          <p>We may update these terms at any time. Continued use of services constitutes acceptance of the revised terms.</p>
        </div>

        <!-- Chinese Version -->
        <div v-if="currentLang === 'zh'" class="content-section">
          <h2>1. 服务概述</h2>
          <p>LazyFirst Co., Ltd.是TikTok Thailand官方认证的本地TAP合作伙伴。我们提供数字化管理系统服务、商品及商家展示、达人匹配、合作登记及定制化功能定价解决方案。</p>

          <h2>2. 用户责任</h2>
          <p>用户应提供真实、准确、完整的信息，遵守泰国法律和平台规则，不得将系统用于非法、侵权或不当目的。</p>

          <h2>3. 费用及支付</h2>
          <p>所有服务费用均基于定制化报价。除另有书面约定外，费用不予退还。</p>

          <h2>4. 知识产权</h2>
          <p>系统功能、商标、内容及所有知识产权均归LazyFirst Co., Ltd.所有。未经授权，禁止复制、分发或修改。</p>

          <h2>5. 责任限制</h2>
          <p>LazyFirst不承担间接、偶发或后果性损害责任。我们保留调整、维护或临时暂停服务的权利。</p>

          <h2>6. 适用法律</h2>
          <p>本条款受泰王国法律管辖。</p>

          <h2>7. 条款修订</h2>
          <p>我们有权随时更新本条款。继续使用服务即视为接受修订后的条款。</p>
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

.back-link {
  text-align: center;
  margin-top: 40px;
}
</style>
