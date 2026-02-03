import { describe, test, expect } from "vitest";
import { resolvePreset, PRESETS } from "./presets.js";

describe("Preset Resolution", () => {
  test("should resolve pure preset", () => {
    const config = resolvePreset("read-only", undefined, undefined);
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledTools).not.toContain("notion_update_page");
    expect(config.enabledBlocks.size).toBe(0);
  });

  test("should add tools to preset (union)", () => {
    const config = resolvePreset("read-only", "notion_update_page", undefined);
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledTools).toContain("notion_update_page");
  });

  test("should add multiple tools to preset", () => {
    const config = resolvePreset(
      "read-only",
      "notion_update_page,notion_delete_block",
      undefined
    );
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledTools).toContain("notion_update_page");
    expect(config.enabledTools).toContain("notion_delete_block");
  });

  test("should override blocks", () => {
    const config = resolvePreset(
      "read-write-markdown",
      undefined,
      "toggle,column"
    );
    expect(config.enabledBlocks).toContain("toggle");
    expect(config.enabledBlocks).toContain("column");
    expect(config.enabledBlocks.size).toBe(2);
  });

  test("should throw on invalid preset", () => {
    expect(() => resolvePreset("invalid", undefined, undefined)).toThrow(
      /Invalid preset/
    );
  });

  test("should list valid presets in error message", () => {
    try {
      resolvePreset("invalid-preset", undefined, undefined);
      expect.fail("Should have thrown error");
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain("read-only");
        expect(error.message).toContain("write-only");
        expect(error.message).toContain("full");
      }
    }
  });

  test("should handle no preset (backward compat)", () => {
    const config = resolvePreset(
      undefined,
      "notion_retrieve_page",
      "toggle"
    );
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledBlocks).toContain("toggle");
  });

  test("should handle empty additional tools", () => {
    const config = resolvePreset("read-only", "", undefined);
    expect(config.enabledTools.size).toBeGreaterThan(0);
  });

  test("should trim whitespace in tool lists", () => {
    const config = resolvePreset(
      "read-only",
      " notion_update_page , notion_delete_block ",
      undefined
    );
    expect(config.enabledTools).toContain("notion_update_page");
    expect(config.enabledTools).toContain("notion_delete_block");
  });

  test("should trim whitespace in block lists", () => {
    const config = resolvePreset(
      "read-only",
      undefined,
      " toggle , column "
    );
    expect(config.enabledBlocks).toContain("toggle");
    expect(config.enabledBlocks).toContain("column");
  });

  test("should filter out empty strings from tool lists", () => {
    const config = resolvePreset("read-only", "notion_update_page,,", undefined);
    expect(config.enabledTools).toContain("notion_update_page");
    expect(Array.from(config.enabledTools)).not.toContain("");
  });

  test("should filter out empty strings from block lists", () => {
    const config = resolvePreset("read-only", undefined, "toggle,,");
    expect(config.enabledBlocks).toContain("toggle");
    expect(Array.from(config.enabledBlocks)).not.toContain("");
  });

  test("should handle preset with block override", () => {
    const config = resolvePreset("full", undefined, "toggle");
    expect(config.enabledBlocks).toContain("toggle");
    expect(config.enabledBlocks.size).toBe(1);
  });

  test("should handle backward compat with no tools or blocks", () => {
    const config = resolvePreset(undefined, undefined, undefined);
    expect(config.enabledTools.size).toBe(0);
    expect(config.enabledBlocks.size).toBe(0);
  });
});

describe("Preset Definitions", () => {
  test("read-only preset has only read tools", () => {
    const preset = PRESETS["read-only"];
    expect(preset.tools.length).toBeGreaterThan(0);
    expect(
      preset.tools.every(
        (t) => t.includes("retrieve") || t.includes("query") || t.includes("search")
      )
    ).toBe(true);
  });

  test("read-only preset has no write tools", () => {
    const preset = PRESETS["read-only"];
    expect(preset.tools.some((t) => t.includes("update"))).toBe(false);
    expect(preset.tools.some((t) => t.includes("delete"))).toBe(false);
    expect(preset.tools.some((t) => t.includes("create"))).toBe(false);
    expect(preset.tools.some((t) => t.includes("append"))).toBe(false);
  });

  test("write-only preset has only write tools", () => {
    const preset = PRESETS["write-only"];
    expect(preset.tools.length).toBeGreaterThan(0);
    expect(
      preset.tools.every(
        (t) =>
          t.includes("update") ||
          t.includes("delete") ||
          t.includes("create") ||
          t.includes("append") ||
          t === "notion_retrieve_bot_user" // Bot user is metadata, not content read
      )
    ).toBe(true);
  });

  test("write-only preset has no content read tools", () => {
    const preset = PRESETS["write-only"];
    const contentReadTools = preset.tools.filter(
      (t) =>
        t.includes("retrieve") &&
        t !== "notion_retrieve_bot_user" // Bot user is metadata
    );
    expect(contentReadTools).toEqual([]);
    expect(preset.tools.some((t) => t.includes("query"))).toBe(false);
    expect(preset.tools.some((t) => t.includes("search"))).toBe(false);
  });

  test("write-only preset includes notion_update_page_properties", () => {
    const preset = PRESETS["write-only"];
    expect(preset.tools).toContain("notion_update_page_properties");
  });

  test("write-only preset includes notion_create_comment", () => {
    const preset = PRESETS["write-only"];
    expect(preset.tools).toContain("notion_create_comment");
  });

  test("write-only preset does not include invalid notion_update_page", () => {
    const preset = PRESETS["write-only"];
    expect(preset.tools).not.toContain("notion_update_page");
  });

  test("write-markdown preset has markdown and data source creation tools", () => {
    const preset = PRESETS["write-markdown"];
    expect(preset.tools).toContain("notion_append_markdown");
    expect(preset.tools).toContain("notion_create_page_from_markdown");
    expect(preset.tools).toContain("notion_create_data_source_item");
    expect(preset.tools).toContain("notion_retrieve_bot_user");
    // Should not have raw block tools
    expect(preset.tools).not.toContain("notion_append_block_children");
    expect(preset.tools).not.toContain("notion_update_block");
  });

  test("read-write-markdown preset has read and markdown tools", () => {
    const preset = PRESETS["read-write-markdown"];
    expect(preset.tools).toContain("notion_retrieve_page");
    expect(preset.tools).toContain("notion_append_markdown");
    expect(preset.tools).toContain("notion_create_page_from_markdown");
  });

  test("read-write-markdown preset has no raw block write tools", () => {
    const preset = PRESETS["read-write-markdown"];
    expect(preset.tools).not.toContain("notion_append_block_children");
    expect(preset.tools).not.toContain("notion_update_block");
  });

  test("full preset has empty tool list", () => {
    const preset = PRESETS["full"];
    expect(preset.tools).toEqual([]);
  });

  test("full preset has empty block list", () => {
    const preset = PRESETS["full"];
    expect(preset.blocks).toEqual([]);
  });

  test("all presets have blocks property", () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset).toHaveProperty("blocks");
      expect(Array.isArray(preset.blocks)).toBe(true);
    });
  });

  test("all presets have tools property", () => {
    Object.values(PRESETS).forEach((preset) => {
      expect(preset).toHaveProperty("tools");
      expect(Array.isArray(preset.tools)).toBe(true);
    });
  });
});
