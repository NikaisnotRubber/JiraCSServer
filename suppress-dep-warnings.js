/**
 * Suppress Specific Node.js Deprecation Warnings
 *
 * This script suppresses the DEP0169 warning (url.parse() deprecation)
 * which comes from third-party dependencies that haven't been updated yet.
 *
 * The warning is safe to suppress because:
 * 1. Our own code doesn't use url.parse()
 * 2. The warning comes from dependencies (likely OpenAI SDK, Axios, or Express)
 * 3. These libraries will update in future versions
 *
 * Usage: node --require ./suppress-dep-warnings.js your-script.js
 */

const originalEmit = process.emit;

process.emit = function (name, data, ...args) {
  // Suppress specific deprecation warnings
  if (
    name === 'warning' &&
    data &&
    data.name === 'DeprecationWarning' &&
    data.code === 'DEP0169'
  ) {
    // Silently ignore DEP0169 (url.parse() deprecation)
    // This comes from third-party dependencies, not our code
    return false;
  }

  return originalEmit.apply(process, [name, data, ...args]);
};

console.log('✅ DEP0169 (url.parse) warning suppression enabled');
