/**
 * Prompt Engineering Module
 *
 * This module provides a decoupled, maintainable approach to managing prompts and contexts
 * for LLM agents in the Jira workflow system.
 *
 * Architecture:
 * - Context Providers: Domain knowledge and background information
 * - Templates: Structured prompt definitions
 * - Builders: State-aware prompt construction
 */

// Context Providers - Rich domain knowledge
export * from './contexts/jira-knowledge-base';
export * from './contexts/technical-procedures';
export * from './contexts/response-patterns';
export * from './contexts/troubleshooting-guides';

// Prompt Templates
export * from './templates/base-template';
export * from './templates/classifier.template';
export * from './templates/complex-handler.template';
export * from './templates/login-handler.template';
export * from './templates/quality-evaluator.template';

// Builders
export * from './builders/prompt-builder';
export * from './builders/context-assembler';
export * from './builders/state-context-extractor';
