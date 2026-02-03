/**
 * Tests for Markdown-to-Notion conversion using martian library
 * and block schema filtering functionality
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { markdownToBlocks } from "@tryfabric/martian";
import { getFilteredBlockSchema } from "./types/common.js";
import { blockObjectSchema } from "./types/common.js";

/**
 * Type helper for Notion block objects returned by martian
 */
type NotionBlock = {
  type: string;
  [key: string]: any;
};

describe("Markdown to Notion Conversion", () => {
  test("should convert simple paragraph", () => {
    const blocks = markdownToBlocks("Hello world") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].paragraph).toBeDefined();
  });

  test("should convert heading level 1", () => {
    const blocks = markdownToBlocks("# Main Title") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("heading_1");
    expect(blocks[0].heading_1).toBeDefined();
  });

  test("should convert heading level 2", () => {
    const blocks = markdownToBlocks("## Section Title") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("heading_2");
    expect(blocks[0].heading_2).toBeDefined();
  });

  test("should convert heading level 3", () => {
    const blocks = markdownToBlocks("### Subsection Title") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("heading_3");
    expect(blocks[0].heading_3).toBeDefined();
  });

  test("should convert bulleted list items", () => {
    const blocks = markdownToBlocks("- Item 1\n- Item 2") as NotionBlock[];
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("bulleted_list_item");
    expect(blocks[1].type).toBe("bulleted_list_item");
    expect(blocks[0].bulleted_list_item).toBeDefined();
    expect(blocks[1].bulleted_list_item).toBeDefined();
  });

  test("should convert numbered list items", () => {
    const blocks = markdownToBlocks("1. First\n2. Second");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("numbered_list_item");
    expect(blocks[1].type).toBe("numbered_list_item");
  });

  test("should convert code block", () => {
    const markdown = "```javascript\nconst x = 1;\n```";
    const blocks = markdownToBlocks(markdown) as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code");
    expect(blocks[0].code).toBeDefined();
  });

  test("should convert code block with language", () => {
    const markdown = "```python\nprint('hello')\n```";
    const blocks = markdownToBlocks(markdown) as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code");
    expect(blocks[0].code).toBeDefined();
  });

  test("should convert table", () => {
    const markdown = "| Col1 | Col2 |\n|------|------|\n| A    | B    |";
    const blocks = markdownToBlocks(markdown) as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("table");
    expect(blocks[0].table).toBeDefined();
  });

  test("should convert blockquote (NOTE)", () => {
    const blocks = markdownToBlocks("> [!NOTE]\n> Important info") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    // Martian converts blockquotes to quote blocks (not callout)
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].quote).toBeDefined();
  });

  test("should convert blockquote (WARNING)", () => {
    const blocks = markdownToBlocks("> [!WARNING]\n> Be careful") as NotionBlock[];
    expect(blocks).toHaveLength(1);
    // Martian converts blockquotes to quote blocks (not callout)
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].quote).toBeDefined();
  });

  test("should handle multiple paragraphs", () => {
    const markdown = "First paragraph\n\nSecond paragraph";
    const blocks = markdownToBlocks(markdown);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("paragraph");
  });

  test("should handle mixed content types", () => {
    const markdown = "# Title\n\nSome text\n\n- List item";
    const blocks = markdownToBlocks(markdown);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("heading_1");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[2].type).toBe("bulleted_list_item");
  });

  test("should handle empty markdown", () => {
    const blocks = markdownToBlocks("");
    expect(Array.isArray(blocks)).toBe(true);
    // Empty input may return empty array or single empty paragraph
    // depending on martian implementation
  });

  test("should handle inline formatting in paragraphs", () => {
    const markdown = "This is **bold** and *italic* text";
    const blocks = markdownToBlocks(markdown) as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    // Martian converts inline formatting to rich text annotations
    expect(blocks[0].paragraph.rich_text).toBeDefined();
    expect(Array.isArray(blocks[0].paragraph.rich_text)).toBe(true);
  });

  test("should handle links in markdown", () => {
    const markdown = "Check out [this link](https://example.com)";
    const blocks = markdownToBlocks(markdown) as NotionBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].paragraph.rich_text).toBeDefined();
  });

  test("should handle nested lists", () => {
    const markdown = "- Parent\n  - Child\n  - Child 2";
    const blocks = markdownToBlocks(markdown);
    // Martian handles nested structures
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].type).toBe("bulleted_list_item");
  });
});

describe("Block Schema Filtering", () => {
  test("should return full schema when empty set provided", () => {
    const filtered = getFilteredBlockSchema(new Set());
    expect(filtered).toEqual(blockObjectSchema);
  });

  test("should filter to only specified block types", () => {
    const enabledBlocks = new Set(["toggle", "divider"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    // Should have base properties
    expect(filtered.properties).toHaveProperty("object");
    expect(filtered.properties).toHaveProperty("type");

    // Should have enabled blocks
    expect(filtered.properties).toHaveProperty("toggle");
    expect(filtered.properties).toHaveProperty("divider");

    // Should NOT have disabled blocks
    expect(filtered.properties).not.toHaveProperty("paragraph");
    expect(filtered.properties).not.toHaveProperty("heading_1");
    expect(filtered.properties).not.toHaveProperty("bulleted_list_item");
  });

  test("should update type description with enabled blocks", () => {
    const enabledBlocks = new Set(["toggle", "column"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    expect(filtered.properties.type.description).toContain("toggle");
    expect(filtered.properties.type.description).toContain("column");
    expect(filtered.properties.type.description).toContain(
      "append_markdown"
    );
  });

  test("should update schema description with enabled blocks", () => {
    const enabledBlocks = new Set(["bookmark", "embed"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    expect(filtered.description).toContain("bookmark");
    expect(filtered.description).toContain("embed");
    expect(filtered.description).toContain("append_markdown");
  });

  test("should handle single enabled block", () => {
    const enabledBlocks = new Set(["toggle"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    expect(filtered.properties).toHaveProperty("toggle");
    expect(Object.keys(filtered.properties).length).toBe(3); // object, type, toggle
  });

  test("should handle multiple enabled blocks", () => {
    const enabledBlocks = new Set([
      "toggle",
      "divider",
      "heading_1",
      "heading_2",
      "paragraph",
    ]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    expect(filtered.properties).toHaveProperty("toggle");
    expect(filtered.properties).toHaveProperty("divider");
    expect(filtered.properties).toHaveProperty("heading_1");
    expect(filtered.properties).toHaveProperty("heading_2");
    expect(filtered.properties).toHaveProperty("paragraph");
  });

  test("should ignore non-existent block types", () => {
    const enabledBlocks = new Set(["toggle", "nonexistent_block_type"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    expect(filtered.properties).toHaveProperty("toggle");
    expect(filtered.properties).not.toHaveProperty("nonexistent_block_type");
  });

  test("should preserve original schema structure", () => {
    const enabledBlocks = new Set(["toggle"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    // Should maintain same top-level structure
    expect(filtered).toHaveProperty("type");
    expect(filtered).toHaveProperty("properties");
    expect(filtered).toHaveProperty("description");
  });

  test("should preserve block type definitions exactly", () => {
    const enabledBlocks = new Set(["toggle"]);
    const filtered = getFilteredBlockSchema(enabledBlocks);

    // The toggle definition should be identical to original
    const originalProps = blockObjectSchema.properties as Record<string, any>;
    expect(filtered.properties.toggle).toEqual(originalProps.toggle);
  });
});

describe("Markdown Conversion Options", () => {
  test("should handle strictImageUrls option", () => {
    const markdown = "![alt text](not-a-valid-url)";
    const blocks = markdownToBlocks(markdown, { strictImageUrls: true });

    expect(blocks).toHaveLength(1);
    // With strictImageUrls, invalid URLs should be converted to text blocks
    // The exact behavior depends on martian implementation
    expect(blocks[0]).toBeDefined();
  });

  test("should handle notionLimits truncate option", () => {
    // Create very long markdown that exceeds Notion limits
    const longText = "a".repeat(3000); // Notion has ~2000 char limit per block
    const markdown = longText;

    const blocks = markdownToBlocks(markdown, {
      notionLimits: { truncate: true },
    });

    expect(blocks).toBeDefined();
    expect(Array.isArray(blocks)).toBe(true);
    // With truncate, should not throw error
  });
});
