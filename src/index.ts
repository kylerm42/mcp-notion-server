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
 * - LOG_LEVEL: Optional. Set logging verbosity. Valid values: debug, info, warn, error, silent (default: info)
 */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { startServer } from "./server/index.js";
import { resolvePreset } from "./presets.js";
import { logger } from "./logger.js";

// Parse command line arguments
logger.debug("Parsing command line arguments");
const argv = yargs(hideBin(process.argv))
  .option("enabledTools", {
    type: "string",
    description: "Comma-separated list of tools to enable",
  })
  .parseSync();
logger.debug("Command line arguments parsed");

// Resolve configuration from preset + overrides
logger.debug("Resolving configuration preset");
const presetName = process.env.NOTION_PRESET;
const additionalTools = process.env.NOTION_ENABLED_TOOLS || argv.enabledTools;
const blockOverride = process.env.NOTION_ENABLED_BLOCKS;

let enabledToolsSet: Set<string>;
let enabledBlocksSet: Set<string>;

try {
  const config = resolvePreset(presetName, additionalTools, blockOverride);
  enabledToolsSet = config.enabledTools;
  enabledBlocksSet = config.enabledBlocks;
  logger.debug(`Configuration resolved: ${enabledToolsSet.size} tools, ${enabledBlocksSet.size} blocks filtered`);
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Configuration error: ${error.message}`);
    process.exit(1);
  }
  throw error;
}

// if test environment, do not execute main()
if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  main().catch((error) => {
    logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

async function main() {
  logger.debug("Initializing main function");
  const startTime = Date.now();
  
  logger.debug("Reading environment variables");
  const notionToken = process.env.NOTION_API_TOKEN;
  const enableMarkdownConversion =
    process.env.NOTION_MARKDOWN_CONVERSION === "true";

  if (!notionToken) {
    logger.error("Please set NOTION_API_TOKEN environment variable");
    process.exit(1);
  }

  logger.info("Starting MCP Notion Server");
  logger.debug(`Markdown conversion: ${enableMarkdownConversion ? "enabled" : "disabled"}`);
  logger.debug(`Enabled tools: ${enabledToolsSet.size === 0 ? "all" : Array.from(enabledToolsSet).slice(0, 5).join(", ")}${enabledToolsSet.size > 5 ? "..." : ""}`);
  logger.debug(`Enabled blocks: ${enabledBlocksSet.size === 0 ? "all" : enabledBlocksSet.size + " filtered"}`);

  logger.debug("Starting server initialization");
  await startServer(
    notionToken,
    enabledToolsSet,
    enableMarkdownConversion,
    enabledBlocksSet
  );

  const duration = Date.now() - startTime;
  logger.info(`MCP Notion Server ready (initialized in ${duration}ms)`);
}
