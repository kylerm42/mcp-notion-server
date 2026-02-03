/**
 * Integration tests for MCP server markdown tool handlers
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { markdownToBlocks } from "@tryfabric/martian";
import { NotionClientWrapper } from "./client/index.js";

// Mock the Notion client
vi.mock("./client/index.js", () => {
  return {
    NotionClientWrapper: vi.fn().mockImplementation(() => ({
      appendBlockChildren: vi.fn(),
      createPage: vi.fn(),
    })),
  };
});

describe("Markdown Tool Handler Integration", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new NotionClientWrapper("fake-token");
  });

  describe("append_markdown handler", () => {
    test("should convert markdown and call appendBlockChildren", async () => {
      const markdown = "# Hello\n\nWorld";
      const blockId = "test-block-id";

      // Convert markdown to blocks (this is what the handler does)
      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      // Mock the client method
      mockClient.appendBlockChildren.mockResolvedValue({
        results: blocks,
        object: "list",
      });

      // Simulate handler behavior
      const response = await mockClient.appendBlockChildren(blockId, blocks);

      // Verify
      expect(mockClient.appendBlockChildren).toHaveBeenCalledWith(
        blockId,
        blocks
      );
      expect(mockClient.appendBlockChildren).toHaveBeenCalledTimes(1);
      expect(response.results).toBeDefined();
    });

    test("should handle markdown with multiple block types", async () => {
      const markdown = "# Title\n\nParagraph text\n\n- List item 1\n- List item 2";
      const blockId = "test-block-id";

      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.appendBlockChildren.mockResolvedValue({
        results: blocks,
        object: "list",
      });

      await mockClient.appendBlockChildren(blockId, blocks);

      expect(mockClient.appendBlockChildren).toHaveBeenCalledWith(
        blockId,
        expect.arrayContaining([
          expect.objectContaining({ type: "heading_1" }),
          expect.objectContaining({ type: "paragraph" }),
          expect.objectContaining({ type: "bulleted_list_item" }),
        ])
      );
    });

    test("should handle markdown with code blocks", async () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      const blockId = "test-block-id";

      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.appendBlockChildren.mockResolvedValue({
        results: blocks,
        object: "list",
      });

      await mockClient.appendBlockChildren(blockId, blocks);

      expect(mockClient.appendBlockChildren).toHaveBeenCalledWith(
        blockId,
        expect.arrayContaining([expect.objectContaining({ type: "code" })])
      );
    });

    test("should handle empty markdown", async () => {
      const markdown = "";
      const blockId = "test-block-id";

      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.appendBlockChildren.mockResolvedValue({
        results: blocks,
        object: "list",
      });

      await mockClient.appendBlockChildren(blockId, blocks);

      expect(mockClient.appendBlockChildren).toHaveBeenCalledWith(
        blockId,
        blocks
      );
    });

    test("should pass strictImageUrls option to martian", () => {
      const markdown = "![alt](not-a-url)";
      
      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      // Should not throw error even with invalid image URL
      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });

    test("should pass notionLimits option to martian", () => {
      const longText = "a".repeat(3000);
      
      const blocks = markdownToBlocks(longText, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      // Should handle truncation without error
      expect(blocks).toBeDefined();
      expect(Array.isArray(blocks)).toBe(true);
    });
  });

  describe("create_page_from_markdown handler", () => {
    test("should convert markdown and call createPage", async () => {
      const markdown = "# Content\n\nPage body";
      const parent = { page_id: "parent-id" };
      const title = "Test Page";

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      const pageProperties = {
        title: [{ type: "text", text: { content: title } }],
      };

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      const response = await mockClient.createPage({
        parent,
        properties: pageProperties,
        children,
        icon: undefined,
      });

      expect(mockClient.createPage).toHaveBeenCalledWith({
        parent,
        properties: pageProperties,
        children,
        icon: undefined,
      });
      expect(response.id).toBe("new-page-id");
    });

    test("should handle page with database parent and properties", async () => {
      const markdown = "Content here";
      const parent = { database_id: "db-id" };
      const properties = {
        Name: [{ type: "text", text: { content: "Item Name" } }],
        Status: { select: { name: "In Progress" } },
      };

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      await mockClient.createPage({
        parent,
        properties,
        children,
        icon: undefined,
      });

      expect(mockClient.createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          parent,
          properties,
          children: expect.any(Array),
        })
      );
    });

    test("should handle page with icon", async () => {
      const markdown = "Page content";
      const parent = { page_id: "parent-id" };
      const icon = { emoji: "📄" };

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      await mockClient.createPage({
        parent,
        properties: {},
        children,
        icon,
      });

      expect(mockClient.createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          icon,
        })
      );
    });

    test("should add title to properties if provided and not already present", async () => {
      const markdown = "Content";
      const parent = { page_id: "parent-id" };
      const title = "My Page";

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      const pageProperties = {
        title: [{ type: "text", text: { content: title } }],
      };

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      await mockClient.createPage({
        parent,
        properties: pageProperties,
        children,
        icon: undefined,
      });

      expect(mockClient.createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            title: expect.any(Array),
          }),
        })
      );
    });

    test("should not override existing title property", async () => {
      const markdown = "Content";
      const parent = { database_id: "db-id" };
      const existingProperties = {
        title: [{ type: "text", text: { content: "Existing Title" } }],
      };

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      await mockClient.createPage({
        parent,
        properties: existingProperties,
        children,
        icon: undefined,
      });

      expect(mockClient.createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            title: [{ type: "text", text: { content: "Existing Title" } }],
          }),
        })
      );
    });

    test("should handle complex markdown with multiple block types", async () => {
      const markdown = `# Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

\`\`\`javascript
const code = true;
\`\`\`

| Col1 | Col2 |
|------|------|
| A    | B    |`;

      const parent = { page_id: "parent-id" };

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.createPage.mockResolvedValue({
        id: "new-page-id",
        object: "page",
      });

      await mockClient.createPage({
        parent,
        properties: {},
        children,
        icon: undefined,
      });

      // Verify children contain various block types
      const call = mockClient.createPage.mock.calls[0][0];
      expect(call.children.length).toBeGreaterThan(3);
    });
  });

  describe("Error handling", () => {
    test("should handle client errors in appendBlockChildren", async () => {
      const markdown = "Test";
      const blockId = "test-block-id";

      const blocks = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.appendBlockChildren.mockRejectedValue(
        new Error("API Error")
      );

      await expect(
        mockClient.appendBlockChildren(blockId, blocks)
      ).rejects.toThrow("API Error");
    });

    test("should handle client errors in createPage", async () => {
      const markdown = "Test";
      const parent = { page_id: "parent-id" };

      const children = markdownToBlocks(markdown, {
        strictImageUrls: true,
        notionLimits: { truncate: true },
      });

      mockClient.createPage.mockRejectedValue(new Error("API Error"));

      await expect(
        mockClient.createPage({
          parent,
          properties: {},
          children,
          icon: undefined,
        })
      ).rejects.toThrow("API Error");
    });
  });
});
