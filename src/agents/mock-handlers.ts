import { AgentOutput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

/**
 * Mock Handler Agents for testing without external APIs
 */

export class MockLoginHandlerAgent {
  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    console.log('[MOCK MODE] Handling login issue...');
    await this.simulateDelay(800);

    const response = this.generateMockResponse(request);
    const processingTime = Date.now() - startTime;

    const processingStep: ProcessingStep = {
      step_name: 'login_handling',
      agent_name: 'MockLoginHandlerAgent',
      timestamp: new Date().toISOString(),
      input: {
        summary: request.forms.Summary,
        comment: request.forms.Comment.Content,
      },
      output: response,
      success: true,
    };

    return {
      processing_history: [...(state.processing_history || []), processingStep],
      current_response: response.response_content,
      current_agent: 'MockLoginHandlerAgent',
      next_action: 'quality_evaluation',
    };
  }

  private generateMockResponse(request: any): AgentOutput {
    return {
      confidence: 0.91,
      suggested_action: 'provide_solution',
      response_content: `[MOCK RESPONSE] 您好！

關於您的登入問題，我這邊幫您檢查並提供以下解決方案：

1. **重置密碼**:
   - 點擊登入頁面的「忘記密碼」連結
   - 輸入您的郵箱地址
   - 系統會發送重置連結到您的郵箱

2. **清除瀏覽器緩存**:
   - 有時候瀏覽器緩存可能導致登入問題
   - 建議清除緩存後重新嘗試

3. **檢查帳號狀態**:
   - 如果以上方法都無效，可能是帳號被鎖定
   - 請聯繫 IT 部門協助解鎖

如果問題持續，請提供更多詳細資訊，我會進一步協助您。

祝您工作順利！`,
      metadata: {
        mock_mode: true,
        handler_type: 'login',
        issue_key: request.forms['Project ID'],
      },
      processing_time: 800,
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MockComplexHandlerAgent {
  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    console.log('[MOCK MODE] Handling complex issue...');
    await this.simulateDelay(1000);

    const response = this.generateMockResponse(request);
    const processingTime = Date.now() - startTime;

    const processingStep: ProcessingStep = {
      step_name: 'complex_handling',
      agent_name: 'MockComplexHandlerAgent',
      timestamp: new Date().toISOString(),
      input: {
        summary: request.forms.Summary,
        comment: request.forms.Comment.Content,
      },
      output: response,
      success: true,
    };

    return {
      processing_history: [...(state.processing_history || []), processingStep],
      current_response: response.response_content,
      current_agent: 'MockComplexHandlerAgent',
      next_action: 'quality_evaluation',
    };
  }

  private generateMockResponse(request: any): AgentOutput {
    return {
      confidence: 0.88,
      suggested_action: 'provide_detailed_solution',
      response_content: `[MOCK RESPONSE] 您好！

感謝您的咨詢。關於您的需求，我這邊提供詳細的處理方案：

1. **權限設置**:
   - 我會協助您設置相關權限
   - 需要您提供具體的項目名稱和所需權限級別
   - 通常需要經過主管批准

2. **欄位配置**:
   - 自定義欄位可以在項目設置中添加
   - 需要指定欄位類型和可選值
   - 設置完成後會自動應用到該項目

3. **後續步驟**:
   - 請提供更多詳細信息
   - 我會在 1-2 個工作日內完成設置
   - 設置完成後會通知您

如有任何問題，請隨時聯繫。

祝好！`,
      metadata: {
        mock_mode: true,
        handler_type: 'complex',
        issue_key: request.forms['Project ID'],
      },
      processing_time: 1000,
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MockGeneralHandlerAgent {
  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    console.log('[MOCK MODE] Handling general inquiry...');
    await this.simulateDelay(700);

    const response = this.generateMockResponse(request);
    const processingTime = Date.now() - startTime;

    const processingStep: ProcessingStep = {
      step_name: 'general_handling',
      agent_name: 'MockGeneralHandlerAgent',
      timestamp: new Date().toISOString(),
      input: {
        summary: request.forms.Summary,
        comment: request.forms.Comment.Content,
      },
      output: response,
      success: true,
    };

    return {
      processing_history: [...(state.processing_history || []), processingStep],
      current_response: response.response_content,
      current_agent: 'MockGeneralHandlerAgent',
      next_action: 'quality_evaluation',
    };
  }

  private generateMockResponse(request: any): AgentOutput {
    return {
      confidence: 0.86,
      suggested_action: 'provide_information',
      response_content: `[MOCK RESPONSE] 您好！

謝謝您的咨詢。關於您的問題，這邊提供一些有用的資訊：

**常見問題解答**:
- Jira 使用教學文檔可在內部 Wiki 查閱
- 如需培訓課程，請聯繫 IT 培訓組
- 技術支援時間：週一至週五 9:00-18:00

**相關資源**:
1. Jira 官方文檔
2. 內部使用指南
3. 視頻教程

如果您需要更具體的幫助，請提供更多詳細信息，我會盡快為您解答。

祝您使用愉快！`,
      metadata: {
        mock_mode: true,
        handler_type: 'general',
        issue_key: request.forms['Project ID'],
      },
      processing_time: 700,
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
