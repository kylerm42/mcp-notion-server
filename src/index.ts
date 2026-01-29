#!/usr/bin/env node
/**
 * All API endpoints support both JSON and Markdown response formats.
 * Set the "format" parameter to "json" or "markdown" (default is "markdown").
 * - Use "markdown" for human-readable output when only reading content
 * - Use "json" when you need to process or modify the data programmatically
 *
 * Command-line Arguments:
 * --enabledTools: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_database")
 *
 * Environment Variables:
 * - NOTION_API_TOKEN: Required. Your Notion API integration token.
 * - NOTION_PRESET: Optional. Predefined configuration preset.
 *   Valid values: read-only, write-only, write-markdown, read-write-markdown, full
 * - NOTION_ENABLED_TOOLS: Optional. Comma-separated list of tools to enable.
 *   When used with NOTION_PRESET, adds tools to preset's base (union).
 *   If set without preset, only these tools will be available. Takes precedence over --enabledTools flag.
 * - NOTION_ENABLED_BLOCKS: Optional. Comma-separated list of block types to enable in raw JSON tools.
 *   When used with NOTION_PRESET, overrides preset's block configuration.
 *   Example: "toggle,column,column_list,bookmark,embed"
 *   If empty, all block types are available. Use with Markdown tools for optimal token efficiency.
 * - NOTION_MARKDOWN_CONVERSION: Optional. Set to "true" to enable
 *   experimental Markdown conversion. If not set or set to any other value,
 *   all responses will be in JSON format regardless of the "format" parameter.
 */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { startServer } from "./server/index.js";
import { resolvePreset } from "./presets.js";

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("enabledTools", {
    type: "string",
    description: "Comma-separated list of tools to enable",
  })
  .parseSync();

// Resolve configuration from preset + overrides
const presetName = process.env.NOTION_PRESET;
const additionalTools = process.env.NOTION_ENABLED_TOOLS || argv.enabledTools;
const blockOverride = process.env.NOTION_ENABLED_BLOCKS;

let enabledToolsSet: Set<string>;
let enabledBlocksSet: Set<string>;

try {
  const config = resolvePreset(presetName, additionalTools, blockOverride);
  enabledToolsSet = config.enabledTools;
  enabledBlocksSet = config.enabledBlocks;
} catch (error) {
  if (error instanceof Error) {
    console.error(`Configuration error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

// if test environment, do not execute main()
if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}

async function main() {
  const notionToken = process.env.NOTION_API_TOKEN;
  const enableMarkdownConversion =
    process.env.NOTION_MARKDOWN_CONVERSION === "true";

  if (!notionToken) {
    console.error("Please set NOTION_API_TOKEN environment variable");
    process.exit(1);
  }

  await startServer(
    notionToken,
    enabledToolsSet,
    enableMarkdownConversion,
    enabledBlocksSet
  );
}
