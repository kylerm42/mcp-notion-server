#!/usr/bin/env node
/**
 * Quick test script to demonstrate debug logging during initialization
 * Run with: LOG_LEVEL=debug NOTION_API_TOKEN=dummy node test-debug-logging.js
 */

// Set test environment to prevent actual server startup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';
process.env.NOTION_API_TOKEN = 'dummy_token_for_testing';

// Import the built module
import('./build/index.js').then(() => {
  console.log('\n✅ Debug logging test complete. Check stderr output above for timing information.');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
