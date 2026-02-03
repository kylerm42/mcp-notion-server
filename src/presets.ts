/**
 * Configuration preset definitions for common use cases
 */

export interface PresetConfig {
  tools: string[];
  blocks: string[];
}

/**
 * Standard preset configurations
 */
export const PRESETS: Record<string, PresetConfig> = {
  "read-only": {
    tools: [
      "retrieve_page",
      "retrieve_block",
      "retrieve_block_children",
      "retrieve_database",
      "retrieve_data_source",
      "query_data_source",
      "search",
      "retrieve_bot_user",
    ],
    blocks: [],
  },

  "write-only": {
    tools: [
      "append_markdown",
      "create_page_from_markdown",
      "append_block_children",
      "update_page_properties",
      "update_block",
      "delete_block",
      "create_database",
      "update_database",
      "update_data_source",
      "create_data_source_item",
      "create_comment",
      "retrieve_bot_user",
    ],
    blocks: [],
  },

  "write-markdown": {
    tools: [
      "append_markdown",
      "create_page_from_markdown",
      "create_data_source_item",
      "update_page_properties",
      "create_comment",
      "retrieve_bot_user",
    ],
    blocks: [],
  },

  "read-write-markdown": {
    tools: [
      "retrieve_page",
      "retrieve_block",
      "retrieve_block_children",
      "retrieve_database",
      "retrieve_data_source",
      "query_data_source",
      "search",
      "retrieve_bot_user",
      "append_markdown",
      "create_page_from_markdown",
      "create_data_source_item",
    ],
    blocks: [],
  },

  full: {
    tools: [],
    blocks: [],
  },
};

/**
 * Resolve preset configuration with optional tool/block overrides
 *
 * Composition rules:
 * - TOOLS: additive (union with preset's base tools)
 * - BLOCKS: override (replaces preset's base blocks if specified)
 *
 * @param presetName Name of preset (or undefined for no preset)
 * @param additionalTools Comma-separated tool names to add
 * @param blockOverride Comma-separated block types to use (overrides preset)
 * @returns Object with enabledTools and enabledBlocks sets
 */
export function resolvePreset(
  presetName: string | undefined,
  additionalTools: string | undefined,
  blockOverride: string | undefined
): { enabledTools: Set<string>; enabledBlocks: Set<string> } {
  // No preset = backward compatible behavior
  if (!presetName) {
    return {
      enabledTools: new Set(
        additionalTools ? additionalTools.split(",").map((s) => s.trim()) : []
      ),
      enabledBlocks: new Set(
        blockOverride ? blockOverride.split(",").map((s) => s.trim()) : []
      ),
    };
  }

  // Validate preset name
  const preset = PRESETS[presetName];
  if (!preset) {
    const validPresets = Object.keys(PRESETS).join(", ");
    throw new Error(
      `Invalid preset: "${presetName}". Valid presets: ${validPresets}`
    );
  }

  // Start with preset's base tools
  const enabledTools = new Set(preset.tools);

  // Add additional tools (union)
  if (additionalTools) {
    additionalTools
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .forEach((tool) => enabledTools.add(tool));
  }

  // Override blocks if specified, otherwise use preset's blocks
  const enabledBlocks = blockOverride
    ? new Set(blockOverride.split(",").map((s) => s.trim()).filter((s) => s.length > 0))
    : new Set(preset.blocks);

  return { enabledTools, enabledBlocks };
}
