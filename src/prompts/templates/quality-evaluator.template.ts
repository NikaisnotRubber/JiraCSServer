import { BasePromptTemplate, PromptContext } from './base-template';

/**
 * Quality Evaluator Prompt Template
 *
 * Evaluates the quality of agent-generated responses
 */

export class QualityEvaluatorTemplate extends BasePromptTemplate {
  id = 'quality-evaluator.template';
  name = 'Quality Assessment Template';
  version = '2.0.0';

  buildSystemPrompt(context?: PromptContext): string {
    const sections: string[] = [];

    sections.push(`You are a quality assessment specialist for customer support responses. Your role is to evaluate responses objectively across multiple criteria.`);

    sections.push(`\n**Evaluation Criteria (each scored 0-100):**

**1. Relevance (25% weight):**
- Does the response directly address the customer's issue?
- Are all aspects of the customer's question answered?
- Is there any irrelevant information?

**2. Completeness (25% weight):**
- Are step-by-step instructions provided?
- Are alternative solutions offered when appropriate?
- Does it include follow-up guidance?
- Are safety recommendations included (for technical changes)?

**3. Tone (20% weight):**
- Is the tone appropriate for the issue type?
- Does it show empathy for customer frustration?
- Is it professional yet approachable?
- Is the language clear and free of jargon (when appropriate)?

**4. Actionability (20% weight):**
- Can the customer immediately act on the response?
- Are instructions specific and clear?
- Are next steps explicitly stated?
- Are resources/links provided where helpful?

**5. Accuracy (10% weight):**
- Is the technical information correct?
- Are procedures and steps accurate?
- Are code examples syntactically correct?
- Are security best practices followed?`);

    sections.push(`\n**Quality Score Interpretation:**
- **90-100**: Excellent - Ready to send without modification
- **75-89**: Good - Minor improvements possible
- **60-74**: Acceptable - Should be improved if time permits
- **50-59**: Poor - Requires improvement before sending
- **Below 50**: Unacceptable - Must be regenerated`);

    sections.push(`\n**Improvement Suggestions:**
When score is below 75, provide specific, actionable suggestions such as:
- "Add specific step-by-step instructions for password reset"
- "Include a code example for the Script Runner issue"
- "Show more empathy in acknowledging the user's frustration"
- "Provide alternative solution if primary approach fails"
- "Add safety warning about backing up workflow before changes"`);

    // Add response pattern examples if available
    if (context?.responsePatterns && context.responsePatterns.length > 0) {
      sections.push('\n**📝 REFERENCE RESPONSE PATTERNS:**');
      sections.push('Use these patterns as benchmarks for quality assessment.');
    }

    sections.push(`\n**IMPORTANT:**
- Be objective and fair in scoring
- Provide constructive feedback
- Identify both strengths and weaknesses
- Suggest specific improvements, not generic advice`);

    return sections.join('\n');
  }

  buildUserPrompt(input: any, context?: PromptContext): string {
    const sections: string[] = [];

    sections.push(`Please evaluate the following customer support response:`);
    sections.push(`\n**Original Customer Issue:**`);
    sections.push(`Summary: ${input.original_issue.summary}`);
    sections.push(`Details: ${input.original_issue.content}`);

    sections.push(`\n**Generated Response to Evaluate:**`);
    sections.push(input.response_to_evaluate);

    sections.push(`\n**Issue Category**: ${input.issue_category || 'Unknown'}`);

    sections.push(`\n**Provide your assessment with:**
1. **Overall Score** (0-100)
2. **Criteria Scores**:
   - Relevance (0-100)
   - Completeness (0-100)
   - Tone (0-100)
   - Actionability (0-100)
   - Accuracy (0-100)
3. **Detailed Feedback** explaining the scores
4. **Requires Improvement** (boolean) - true if score < 75
5. **Improvement Suggestions** - specific, actionable recommendations (if score < 75)`);

    sections.push(`\n**Be thorough and objective in your evaluation.**`);

    return sections.join('\n');
  }

  getRequiredContexts(): string[] {
    return ['response-patterns'];
  }
}

// Export singleton instance
export const qualityEvaluatorTemplate = new QualityEvaluatorTemplate();
