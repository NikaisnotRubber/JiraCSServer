# Quality Evaluator V2 優化報告

## 📋 優化日期
2025-10-15

## 🎯 問題診斷

### 原始問題
在v2方法中發現 Evaluating response quality 階段的置信度偏低，導致系統一直重複循環去修正回應。

### 根本原因分析

1. **評分標準過於嚴格**
   - 固定75分閾值對所有情況一視同仁
   - 重試時沒有調整評分標準，導致無限循環
   - AI評估器可能對某些類型的回應評分偏低

2. **上下文傳遞不完整**
   - evaluator沒有獲得足夠的分類信息（confidence, reasoning）
   - 重試時缺少previous score信息
   - 沒有明確告知evaluator這是重試評估

3. **日志輸出不足**
   - 難以追蹤完整的prompt內容
   - 無法看到AI實際收到的評估上下文
   - 缺少中間處理流程的詳細信息

4. **重試邏輯問題**
   - 每次重試都用相同的標準評估
   - 接近max_retries時仍然可能拒絕合理的回應

## 🔧 實施的優化

### 1. 自適應質量閾值 (Adaptive Quality Threshold)

```typescript
// 第一次評估: 嚴格標準 (75分)
// 後續重試: 逐漸放寬標準
const qualityThreshold = state.retry_count === 0
  ? 75
  : Math.max(65, 75 - (state.retry_count * 5));
```

**優勢：**
- 第1次嘗試: 75分（嚴格）
- 第2次嘗試: 70分（稍寬鬆）
- 第3次嘗試: 65分（更寬鬆）
- 避免無限循環，同時保持質量標準

### 2. 增強的上下文傳遞

```typescript
const input = {
  original_issue: {
    summary: state.original_request.forms.Summary,
    content: state.original_request.forms.Comment.Content,
  },
  response_to_evaluate: state.current_response,
  issue_category: state.classification?.category || 'Unknown',
  classification_confidence: state.classification?.confidence || 0,
  classification_reasoning: state.classification?.reasoning || 'N/A',
  retry_context: state.retry_count > 0 ? {
    retry_count: state.retry_count,
    previous_feedback: state.quality_feedback,
    previous_score: state.quality_score,  // 新增
  } : undefined,
};
```

**改進：**
- 添加分類置信度和推理信息
- 包含上一次的評分（不只是feedback）
- 幫助evaluator理解問題複雜度

### 3. 詳細的調試日志

新增三個日志方法：

#### a) `logEvaluationContext()`
記錄評估前的完整上下文，包括：
- 原始問題信息
- 生成回應的長度
- 如果是重試：previous score和所有criteria分數

#### b) `logPromptDetails()`
記錄發送給OpenAI的prompt詳情：
- System prompt和user prompt的長度
- 預估token數量
- Prompt內容預覽（前300-400字符）

#### c) 增強的 `logCurrentState()`
添加了：
- Classification reasoning
- 完整的processing history
- 更清晰的retry信息展示

### 4. 改進的Prompt Template

```typescript
// 在prompt中明確說明重試上下文
if (input.retry_context && input.retry_context.retry_count > 0) {
  sections.push(`\n**🔄 RETRY CONTEXT (Attempt #${input.retry_context.retry_count + 1}):**`);
  sections.push(`This response has been regenerated based on quality feedback.`);
  sections.push(`- Previous Score: ${input.retry_context.previous_score || 'N/A'}`);
  sections.push(`\n**IMPORTANT**: When evaluating retry attempts:`);
  sections.push(`- Consider if improvements were made based on previous feedback`);
  sections.push(`- Be objective - don't automatically lower scores for retries`);
  sections.push(`- Evaluate the current response on its own merits`);
  sections.push(`- If the response adequately addresses the issue, score it fairly`);
}
```

**新增評估指南：**
```typescript
sections.push(`\n**Evaluation Guidelines:**`);
sections.push(`- Be objective and fair in your assessment`);
sections.push(`- Focus on whether the response helps the customer solve their problem`);
sections.push(`- A response doesn't need to be perfect to score 75+`);
sections.push(`- Consider the complexity of the issue when evaluating completeness`);
sections.push(`- Professional, clear responses that address the core issue should score well`);
```

### 5. Max Retries保護機制

```typescript
// 接近max retries時，接受合理的回應
if (state.retry_count >= state.max_retries - 1 && assessment.score >= 60) {
  console.warn(`⚠️  [QualityEvaluatorV2] Near max retries, accepting score ${assessment.score}`);
  assessment.requires_improvement = false;
}
```

**避免情況：**
- 即使在最後一次重試，仍然因為差1-2分而拒絕
- 系統陷入"永遠無法滿足"的狀態

### 6. Workflow Graph V2整合

```typescript
const useV2Agents = process.env.USE_V2_AGENTS === 'true' || true; // Default to V2

if (useV2Agents) {
  console.log('🔧 [V2 MODE] Initializing workflow with V2 agents');
  classificationAgent = new ProblemClassificationAgentV2();
  loginHandler = new LoginHandlerAgentV2();
  complexHandler = new ComplexHandlerAgentV2();
  qualityEvaluator = new QualityEvaluatorAgentV2();
}
```

## 📊 優化效果預期

### 減少無限循環
- **之前**: 可能在75分附近反復評估
- **之後**: 自適應閾值確保最終接受合理回應

### 更公平的評估
- **之前**: AI不理解重試背景，可能過於嚴格
- **之後**: 明確告知這是重試，要求客觀評估

### 更好的調試能力
- **之前**: 只能看到最終分數，難以定位問題
- **之後**: 完整的prompt和context日志，便於分析

## 🔍 使用方法

### 1. 啟用V2 Agents

在 `.env` 文件中設置：
```env
USE_V2_AGENTS=true
```

### 2. 查看詳細日志

V2 Quality Evaluator會自動輸出詳細日志：

```
================================================================================
🎯 [QualityEvaluatorV2] Starting Quality Evaluation
================================================================================

📋 [QualityEvaluatorV2] Current Workflow State:
   Workflow ID: xxx
   Current Agent: ComplexHandlerAgentV2
   Retry Count: 1/3
   ...

🔍 [QualityEvaluatorV2] Evaluation Context:
   Original Issue Summary: ...
   Generated Response Length: 1234 chars
   ⚠️  This is a RETRY evaluation (attempt #2)
   Previous Score: 72
   Previous Criteria Scores:
     - Relevance: 80
     - Completeness: 70
     ...

📝 [QualityEvaluatorV2] Prompt Details:
   System Prompt Length: 2341 chars
   User Prompt Length: 1532 chars
   Total Estimated Tokens: 968
   System Prompt Preview: ...
   User Prompt Preview: ...

📏 [QualityEvaluatorV2] Quality threshold for this evaluation: 70

📊 [QualityEvaluatorV2] Assessment Results:
   Overall Score: 78/100
   Requires Improvement: false
   Next Action: finalize_response
```

### 3. 調整評估參數

如果需要更嚴格或更寬鬆的評估，可以修改：

```typescript
// src/agents/quality-evaluator-v2.ts

// 調整自適應閾值算法
const qualityThreshold = state.retry_count === 0
  ? 80  // 更嚴格：改為80
  : Math.max(60, 80 - (state.retry_count * 5));  // 對應調整

// 調整max retries保護閾值
if (state.retry_count >= state.max_retries - 1 && assessment.score >= 65) {
  // 改為65分才接受
}
```

## 🧪 測試建議

### 1. 測試不同複雜度的問題

```bash
# 簡單問題（應該第一次就通過）
curl -X POST http://localhost:3000/api/jira/process_test \
  -H "Content-Type: application/json" \
  -d @test-simple-issue.json

# 複雜問題（可能需要1-2次重試）
curl -X POST http://localhost:3000/api/jira/process_test \
  -H "Content-Type: application/json" \
  -d @test-complex-issue.json
```

### 2. 監控評估指標

關注日志中的：
- Quality threshold（每次重試應該降低）
- Assessment score（是否有改進）
- Retry count（不應該達到max_retries）
- Next action（何時finalize）

### 3. 驗證優化效果

**成功指標：**
- ✅ 大部分回應在1-2次評估內通過
- ✅ 很少觸發max_retries保護機制
- ✅ 評分隨重試次數合理調整
- ✅ 日志清晰顯示評估過程

**仍需調整的信號：**
- ❌ 大量回應觸發max_retries保護
- ❌ 評分始終低於閾值
- ❌ 重試後評分反而降低

## 📝 後續優化建議

### 短期（已實現）
- ✅ 自適應質量閾值
- ✅ 增強上下文傳遞
- ✅ 詳細調試日志
- ✅ Prompt優化

### 中期（可考慮）
- 📌 根據issue_category動態調整評分標準
  - JIRA_SIMPLE: 更寬鬆（70分即可）
  - JIRA_COMPLEX: 保持嚴格（75分）
- 📌 記錄評估歷史，分析評分趨勢
- 📌 添加評估時間限制，避免單次評估過長

### 長期（未來方向）
- 🔮 使用不同的LLM進行質量評估（避免偏見）
- 🔮 基於用戶反饋訓練評估模型
- 🔮 A/B測試不同評估策略

## 🎓 技術亮點

### 1. 狀態感知評估 (State-Aware Evaluation)
系統現在能夠根據workflow狀態（retry count, previous scores）動態調整評估策略。

### 2. 漸進式質量標準 (Progressive Quality Standards)
不再使用一刀切的標準，而是根據嘗試次數逐步調整期望。

### 3. 透明的評估過程 (Transparent Evaluation)
完整的日志記錄使得評估過程可追溯、可調試、可優化。

### 4. 智能保護機制 (Smart Fallback)
在極端情況下（接近max retries），系統會接受"足夠好"的回應，避免完全失敗。

## 📚 相關文件

- [src/agents/quality-evaluator-v2.ts](./src/agents/quality-evaluator-v2.ts) - 主要實現
- [src/prompts/templates/quality-evaluator.template.ts](./src/prompts/templates/quality-evaluator.template.ts) - Prompt模板
- [src/workflow/graph.ts](./src/workflow/graph.ts) - Workflow整合
- [.env.example](./.env.example) - 配置示例

## 🤝 貢獻

如果發現評估仍然存在問題，請：
1. 收集完整的日志輸出
2. 記錄具體的測試case
3. 提出改進建議

---

**版本:** 2.0.1
**最後更新:** 2025-10-15
**維護者:** JiraCS Team
