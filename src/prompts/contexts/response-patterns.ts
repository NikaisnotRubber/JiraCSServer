import { ResponsePattern } from '../templates/base-template';

/**
 * Response Patterns Knowledge Base
 *
 * Provides structured response patterns and examples for different types
 * of customer support scenarios. These patterns guide the LLM to generate
 * consistent, professional, and effective responses.
 */

export const loginIssuePatterns: ResponsePattern[] = [
  {
    name: 'Password Reset Response',
    applicableWhen: 'User cannot log in due to forgotten or incorrect password',
    structure: [
      '1. Empathetic acknowledgment of the issue',
      '2. Immediate solution (password reset link)',
      '3. Step-by-step instructions',
      '4. Proactive assistance (account status check)',
      '5. Alternative solution if first one fails',
      '6. Contact information for further assistance',
    ],
    examples: [
      {
        scenario: 'User forgot password and cannot access Jira',
        response: `您好 PETER.W.WANG,

我完全理解無法登入系統帶來的困擾,讓我立即協助您解決這個問題。

**立即解決方案:**
我已經為您檢查了帳號狀態,您的帳號目前是啟用狀態,看起來是密碼驗證的問題。請按照以下步驟重設密碼:

1. 前往 Jira 登入頁面,點擊「忘記密碼」連結
2. 輸入您的電子郵件地址: peter.w.wang@company.com
3. 查收標題為「Jira 密碼重設」的電子郵件
4. 點擊郵件中的重設連結(連結有效期為 24 小時)
5. 設定新密碼(至少 8 個字元,包含大小寫字母和數字)

**如果您沒有收到重設郵件:**
- 檢查垃圾郵件資料夾
- 確認公司郵件系統沒有阻擋來自 Jira 的郵件
- 聯繫我們直接協助您重設密碼

**備用方案:**
如果上述方法無法解決,我可以立即為您:
- 手動重設密碼並通過安全方式發送給您
- 檢查是否有其他帳號配置問題

請告訴我是否成功重設密碼,或者需要進一步協助。我隨時待命!

祝順利,
技術支援團隊`,
      },
    ],
  },
  {
    name: 'Account Lockout Response',
    applicableWhen: 'User account is locked due to multiple failed login attempts',
    structure: [
      '1. Confirm the account lockout status',
      '2. Explain the reason (security measure)',
      '3. Immediate unlock action',
      '4. Prevention tips for future',
      '5. Password reset recommendation',
    ],
    examples: [
      {
        scenario: 'Account locked after multiple failed attempts',
        response: `您好,

我已經檢查您的帳號狀態,確認您的帳號因連續多次登入失敗而被系統自動鎖定,這是我們的安全保護機制。

**已為您處理:**
✓ 我已經立即解鎖您的帳號
✓ 您現在可以重新登入

**重要提醒:**
為了避免再次被鎖定,建議您:
1. 使用密碼重設功能設定一個新密碼
2. 使用密碼管理工具儲存密碼
3. 如果連續 3 次輸入錯誤密碼,系統會自動鎖定帳號 15 分鐘

**下一步:**
建議您現在就重設密碼,以確保能順利登入。需要我協助您進行密碼重設嗎?

技術支援團隊`,
      },
    ],
  },
];

export const complexTechnicalPatterns: ResponsePattern[] = [
  {
    name: 'Script Debugging Response',
    applicableWhen: 'User reports Script Runner errors or script failures',
    structure: [
      '1. Acknowledge the technical complexity',
      '2. Request specific error details if not provided',
      '3. Root cause analysis based on error type',
      '4. Step-by-step diagnostic procedure',
      '5. Code example or fix if applicable',
      '6. Testing recommendations',
      '7. Preventive best practices',
    ],
    examples: [
      {
        scenario: 'Script Runner post-function failing with NullPointerException',
        response: `您好,

感謝您提供的詳細資訊。Script Runner 的 NullPointerException 通常是由於存取了空值物件所導致,讓我協助您進行系統化的診斷和修復。

**問題根因分析:**
根據您提供的錯誤訊息 "NullPointerException at line 45",這表示在第 45 行嘗試存取的物件為 null。

**診斷步驟:**
1. 前往 Administration → System → Logging and Profiling
2. 下載 atlassian-jira.log 並找到完整的 stack trace
3. 確認第 45 行正在存取的物件或欄位
4. 檢查該物件在此時機點是否可能為 null

**修復方案:**
在您的腳本中加入空值檢查:

\`\`\`groovy
// 修復前 (會拋出 NPE)
def customField = issue.getCustomFieldValue(fieldObject)
def value = customField.toString()  // 如果 customField 是 null 就會失敗

// 修復後 (加入空值檢查)
def customField = issue.getCustomFieldValue(fieldObject)
if (customField != null) {
    def value = customField.toString()
    // 處理邏輯
} else {
    log.warn("Custom field is null for issue \${issue.key}")
    // 處理 null 情況
}
\`\`\`

**測試建議:**
1. 使用 Script Console 測試修改後的腳本
2. 先在測試專案中驗證工作流程
3. 加入詳細的 log.warn() 紀錄以便日後除錯

**預防措施:**
- 對所有可能為 null 的物件都加入檢查
- 使用 Groovy 的安全導航操作符: \`issue.assignee?.displayName\`
- 在腳本開頭加入輸入驗證

需要我協助您檢視完整的腳本程式碼嗎?請提供腳本內容,我可以幫您進行更詳細的程式碼審查。

技術支援團隊`,
      },
    ],
  },
  {
    name: 'Integration Troubleshooting Response',
    applicableWhen: 'Issues with REST API, webhooks, or external integrations',
    structure: [
      '1. Identify the integration type and failure point',
      '2. Check authentication and connectivity',
      '3. Validate configuration settings',
      '4. Provide testing commands (curl examples)',
      '5. Review logs and error codes',
      '6. Offer solution with code examples',
      '7. Suggest monitoring and prevention',
    ],
    examples: [
      {
        scenario: 'REST API returning 401 Unauthorized',
        response: `您好,

REST API 401 錯誤通常與身份驗證相關,讓我協助您系統化地排查這個問題。

**立即檢查清單:**

**1. 驗證 API Token 格式 (Jira Cloud):**
\`\`\`bash
# 正確的格式
curl -u email@company.com:your_api_token \\
  -H "Content-Type: application/json" \\
  https://your-domain.atlassian.net/rest/api/3/myself
\`\`\`

**2. 檢查 Base64 編碼 (如果手動設定 Header):**
\`\`\`bash
# 產生正確的 Base64 編碼
echo -n "email@company.com:api_token" | base64

# 使用在 Authorization header
Authorization: Basic <base64_string>
\`\`\`

**3. 常見問題排查:**
- ✓ 確認使用 API Token 而非密碼 (Jira Cloud 必須使用 Token)
- ✓ 檢查 email 地址是否正確
- ✓ 驗證 API Token 是否過期或被撤銷
- ✓ 確認帳號未被鎖定或停用
- ✓ 檢查帳號是否有存取該 API endpoint 的權限

**4. 測試步驟:**
\`\`\`bash
# 測試基本連線和驗證
curl -v -u email@company.com:your_api_token \\
  https://your-domain.atlassian.net/rest/api/3/myself

# 成功會返回 200 OK 和您的使用者資訊
\`\`\`

**5. 如果仍然失敗:**
- 重新產生新的 API Token: Account Settings → Security → API Tokens
- 檢查 Jira 稽核日誌: Administration → System → Audit log
- 驗證網路層沒有攔截請求

**API Token 產生步驟:**
1. 登入 Atlassian 帳戶
2. 前往 Account Settings → Security
3. 點擊「Create API token」
4. 複製並安全儲存 token (僅顯示一次)

請測試後告訴我結果,如果還有問題,請提供:
- 完整的 curl 命令 (隱藏敏感資訊)
- 返回的完整錯誤訊息

技術支援團隊`,
      },
    ],
  },
];

export const generalInquiryPatterns: ResponsePattern[] = [
  {
    name: 'Feature Request Response',
    applicableWhen: 'User asks about features or requests new functionality',
    structure: [
      '1. Acknowledge the request positively',
      '2. Check if feature already exists',
      '3. Provide workarounds if feature is not available',
      '4. Explain how to submit feature request',
      '5. Offer alternative solutions',
    ],
    examples: [
      {
        scenario: 'User requests a feature that does not exist',
        response: `您好,

感謝您的寶貴建議!這個功能確實會很有幫助。

**目前狀況:**
目前 Jira 標準功能尚未包含您提到的這個特性,但我們有幾個替代方案可以達到類似的效果:

**方案 1: 使用 Marketplace App**
- 您可以在 Atlassian Marketplace 搜尋相關的外掛程式
- 推薦: [相關外掛名稱]

**方案 2: 自訂解決方案**
- 使用 Script Runner 開發客製化功能
- 透過 REST API 整合外部工具

**提交功能請求:**
如果您希望這個功能成為 Jira 標準功能:
1. 前往 Atlassian Community
2. 搜尋是否已有類似的功能請求
3. 如果沒有,建立新的功能請求並詳細描述使用情境
4. 邀請同事投票支持

需要我協助您評估哪個替代方案最適合您的需求嗎?

技術支援團隊`,
      },
    ],
  },
];

/**
 * Get relevant response patterns based on classification
 */
export function getResponsePatterns(category: string): ResponsePattern[] {
  switch (category) {
    case 'JIRA_SIMPLE':
      return loginIssuePatterns;
    case 'JIRA_COMPLEX':
      return complexTechnicalPatterns;
    case 'GENERAL':
      return generalInquiryPatterns;
    default:
      return [];
  }
}

/**
 * All response patterns combined
 */
export const allResponsePatterns: ResponsePattern[] = [
  ...loginIssuePatterns,
  ...complexTechnicalPatterns,
  ...generalInquiryPatterns,
];
