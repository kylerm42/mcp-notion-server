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
      "notion_retrieve_page",
      "notion_retrieve_block",
      "notion_retrieve_block_children",
      "notion_retrieve_database",
      "notion_retrieve_data_source",
      "notion_query_data_source",
      "notion_search",
    ],
    blocks: [],
  },

  "write-only": {
    tools: [
      "notion_append_markdown",
      "notion_create_page_from_markdown",
      "notion_append_block_children",
      "notion_update_page",
      "notion_update_block",
      "notion_delete_block",
      "notion_create_database",
      "notion_update_database",
      "notion_update_data_source",
      "notion_create_data_source_item",
    ],
    blocks: [],
  },

  "write-markdown": {
    tools: ["notion_append_markdown", "notion_create_page_from_markdown"],
    blocks: [],
  },

  "read-write-markdown": {
    tools: [
      "notion_retrieve_page",
      "notion_retrieve_block",
      "notion_retrieve_block_children",
      "notion_retrieve_database",
      "notion_retrieve_data_source",
      "notion_query_data_source",
      "notion_search",
      "notion_append_markdown",
      "notion_create_page_from_markdown",
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
