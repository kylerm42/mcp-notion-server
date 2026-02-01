/**
 * Unit tests for table renderer
 */

import { describe, test, expect, beforeEach } from "vitest";
import { renderPageListAsTable } from "./table-renderer.js";
import { PageResponse } from "../types/index.js";

describe("renderPageListAsTable", () => {
  const mockDataSourceId = "test-data-source-123";
  
  const mockSchema = {
    "Status": { type: "select" },
    "Type": { type: "multi_select" },
    "IP Address": { type: "url" },
    "Device": { type: "relation" },
    "Description": { type: "rich_text" }
  };

  const createMockPage = (
    id: string,
    title: string,
    properties: Record<string, any>
  ): PageResponse => ({
    object: "page",
    id,
    created_time: "2025-01-01T00:00:00.000Z",
    last_edited_time: "2025-01-01T00:00:00.000Z",
    url: `https://notion.so/${id}`,
    parent: {
      type: "data_source_id",
      data_source_id: mockDataSourceId,
    },
    properties: {
      Title: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: { content: title, link: null },
            plain_text: title,
            href: null,
          },
        ],
      },
      ...properties,
    },
  });

  describe("column selection", () => {
    test("should include all schema properties when columns undefined", async () => {
      const pages = [
        createMockPage("page1", "Test Page", {
          Status: { id: "s1", type: "select", select: { name: "Active" } },
          Type: { id: "t1", type: "multi_select", multi_select: [{ name: "A" }] },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        undefined,
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      // Should include Title + all schema properties
      expect(result).toContain("| Title | Status | Type | IP Address | Device | Description |");
    });

    test("should include only specified columns when provided", async () => {
      const pages = [
        createMockPage("page1", "Test Page", {
          Status: { id: "s1", type: "select", select: { name: "Active" } },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("| Title | Status |");
      expect(result).not.toContain("Type");
      expect(result).not.toContain("IP Address");
    });

    test("should always include Title column even if not in columns array", async () => {
      const pages = [
        createMockPage("page1", "Test Page", {
          Status: { id: "s1", type: "select", select: { name: "Active" } },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Title");
    });

    test("should filter out columns not in schema", async () => {
      const pages = [
        createMockPage("page1", "Test Page", {}),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status", "NonExistent", "Type"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      // Should include Title, Status, Type but not NonExistent
      expect(result).toContain("Status");
      expect(result).toContain("Type");
      expect(result).not.toContain("NonExistent");
    });
  });

  describe("cell formatting", () => {
    test("should truncate values longer than maxColumnWidth", async () => {
      const longText = "a".repeat(100);
      const pages = [
        createMockPage("page1", "Test", {
          Description: {
            id: "d1",
            type: "rich_text",
            rich_text: [{ type: "text", text: { content: longText }, plain_text: longText }],
          },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Description"],
        mockDataSourceId,
        mockSchema,
        false,
        null,
        50
      );

      // Should be truncated to 50 chars with ...
      expect(result).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...");
      expect(result).not.toContain("a".repeat(60));
    });

    test("should show relation count instead of IDs", async () => {
      const pages = [
        createMockPage("page1", "Test", {
          Device: {
            id: "dev1",
            type: "relation",
            relation: [
              { id: "rel-1" },
              { id: "rel-2" },
              { id: "rel-3" },
            ],
          },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Device"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("3 relations");
      expect(result).not.toContain("rel-1");
    });

    test("should show single relation as '1 relation'", async () => {
      const pages = [
        createMockPage("page1", "Test", {
          Device: {
            id: "dev1",
            type: "relation",
            relation: [{ id: "rel-1" }],
          },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Device"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("1 relation");
    });

    test("should show file count instead of URLs", async () => {
      const pages = [
        createMockPage("page1", "Test", {
          Attachments: {
            id: "att1",
            type: "files",
            files: [
              { name: "file1.pdf", file: { url: "https://example.com/file1.pdf" } },
              { name: "file2.jpg", file: { url: "https://example.com/file2.jpg" } },
            ],
          },
        }),
      ];

      const schema = { ...mockSchema, Attachments: { type: "files" } };

      const result = await renderPageListAsTable(
        pages,
        ["Attachments"],
        mockDataSourceId,
        schema,
        false,
        null
      );

      expect(result).toContain("2 files");
      expect(result).not.toContain("https://example.com");
    });

    test("should show checkbox as symbols", async () => {
      const pages = [
        createMockPage("page1", "Checked", {
          Done: { id: "done1", type: "checkbox", checkbox: true },
        }),
        createMockPage("page2", "Unchecked", {
          Done: { id: "done2", type: "checkbox", checkbox: false },
        }),
      ];

      const schema = { ...mockSchema, Done: { type: "checkbox" } };

      const result = await renderPageListAsTable(
        pages,
        ["Done"],
        mockDataSourceId,
        schema,
        false,
        null
      );

      expect(result).toContain("✓");
      expect(result).toContain("✗");
    });

    test("should escape pipe characters in cell values", async () => {
      const pages = [
        createMockPage("page1", "Test", {
          Description: {
            id: "d1",
            type: "rich_text",
            rich_text: [
              { type: "text", text: { content: "Value | with | pipes" }, plain_text: "Value | with | pipes" },
            ],
          },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Description"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Value \\| with \\| pipes");
      // Verify pipes are properly escaped by checking the escaped form is present
      expect(result).toMatch(/\| Test \| Value \\| with \\| pipes \|/)
    });

    test("should handle missing properties gracefully", async () => {
      const pages = [
        createMockPage("page1", "Test", {}), // No Status property
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      // Should have empty cell
      expect(result).toContain("| Test |  |");
    });

    test("should handle rollup properties", async () => {
      const pages = [
        createMockPage("page1", "Test", {
          Summary: {
            id: "sum1",
            type: "rollup",
            rollup: {
              type: "array",
              array: [{ type: "number", number: 1 }, { type: "number", number: 2 }],
            },
          },
        }),
      ];

      const schema = { ...mockSchema, Summary: { type: "rollup" } };

      const result = await renderPageListAsTable(
        pages,
        ["Summary"],
        mockDataSourceId,
        schema,
        false,
        null
      );

      expect(result).toContain("Rollup");
    });
  });

  describe("empty and edge cases", () => {
    test("should handle empty results gracefully", async () => {
      const result = await renderPageListAsTable(
        [],
        ["Status"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("*No results found*");
      expect(result).toContain("Results: 0");
      expect(result).not.toContain("## Drill-Down"); // No drill-down section for empty results
    });

    test("should handle single result", async () => {
      const pages = [createMockPage("page1", "Only One", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Results: 1");
      expect(result).toContain("Only One");
    });

    test("should handle pages with Untitled fallback", async () => {
      const pageWithoutTitle: PageResponse = {
        object: "page",
        id: "page1",
        created_time: "2025-01-01T00:00:00.000Z",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        url: "https://notion.so/page1",
        parent: {
          type: "data_source_id",
          data_source_id: mockDataSourceId,
        },
        properties: {},
      };

      const result = await renderPageListAsTable(
        [pageWithoutTitle],
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Untitled");
    });

    test("should handle unicode and emoji in titles", async () => {
      const pages = [
        createMockPage("page1", "🚀 Test 测试", {}),
      ];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("🚀 Test 测试");
    });

    test("should handle very long values correctly", async () => {
      const veryLongText = "x".repeat(1000);
      const pages = [
        createMockPage("page1", "Test", {
          Description: {
            id: "d1",
            type: "rich_text",
            rich_text: [
              { type: "text", text: { content: veryLongText }, plain_text: veryLongText },
            ],
          },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Description"],
        mockDataSourceId,
        mockSchema,
        false,
        null,
        50
      );

      // Should be truncated to exactly 50 chars
      const lines = result.split("\n");
      const dataRow = lines.find(line => line.includes("xxx"));
      expect(dataRow).toBeDefined();
      
      // Extract the Description cell value
      const cells = dataRow!.split("|").map(c => c.trim());
      const descCell = cells[2]; // Title is cells[1], Description is cells[2]
      expect(descCell.length).toBeLessThanOrEqual(50);
      expect(descCell).toContain("...");
    });
  });

  describe("pagination metadata", () => {
    test("should show next cursor when has_more is true", async () => {
      const pages = [createMockPage("page1", "Test", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        true,
        "cursor-abc-123"
      );

      expect(result).toContain("## Pagination");
      expect(result).toContain('start_cursor: "cursor-abc-123"');
      expect(result).toContain("Additional items available");
    });

    test("should omit pagination section when no more results", async () => {
      const pages = [createMockPage("page1", "Test", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).not.toContain("## Pagination");
    });

    test("should indicate page 1+ when has_more is true", async () => {
      const pages = [createMockPage("page1", "Test", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        true,
        "cursor-xyz"
      );

      expect(result).toContain("Results: 1 (page 1+)");
    });

    test("should not indicate page number when has_more is false", async () => {
      const pages = [createMockPage("page1", "Test", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Results: 1");
      expect(result).not.toContain("page 1+");
    });
  });

  describe("drill-down instructions", () => {
    test("should include drill-down section with first page ID", async () => {
      const pages = [
        createMockPage("first-page-id", "First", {}),
        createMockPage("second-page-id", "Second", {}),
      ];

      const result = await renderPageListAsTable(
        pages,
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).toContain("## Drill-Down");
      expect(result).toContain('page_id: "first-page-id"');
    });

    test("should omit drill-down section for empty results", async () => {
      const result = await renderPageListAsTable(
        [],
        [],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      expect(result).not.toContain("## Drill-Down");
    });
  });

  describe("table structure", () => {
    test("should generate valid Markdown table structure", async () => {
      const pages = [
        createMockPage("page1", "Test1", {
          Status: { id: "s1", type: "select", select: { name: "Active" } },
        }),
        createMockPage("page2", "Test2", {
          Status: { id: "s2", type: "select", select: { name: "Inactive" } },
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      const lines = result.split("\n");
      
      // Find table section
      const tableStartIdx = lines.findIndex(line => line.includes("## Results Table"));
      expect(tableStartIdx).toBeGreaterThan(-1);
      
      // Header row should be after Results Table heading
      const headerRow = lines[tableStartIdx + 2];
      expect(headerRow).toContain("| Title | Status |");
      
      // Separator row
      const separatorRow = lines[tableStartIdx + 3];
      expect(separatorRow).toMatch(/\|[-]+\|[-]+\|/);
      
      // Data rows
      expect(lines[tableStartIdx + 4]).toContain("Test1");
      expect(lines[tableStartIdx + 4]).toContain("Active");
      expect(lines[tableStartIdx + 5]).toContain("Test2");
      expect(lines[tableStartIdx + 5]).toContain("Inactive");
    });

    test("should have consistent column count across all rows", async () => {
      const pages = [
        createMockPage("page1", "Test1", {
          Status: { id: "s1", type: "select", select: { name: "Active" } },
          Type: { id: "t1", type: "multi_select", multi_select: [{ name: "A" }] },
        }),
        createMockPage("page2", "Test2", {
          Status: { id: "s2", type: "select", select: { name: "Inactive" } },
          // Type missing
        }),
      ];

      const result = await renderPageListAsTable(
        pages,
        ["Status", "Type"],
        mockDataSourceId,
        mockSchema,
        false,
        null
      );

      const lines = result.split("\n");
      const tableLines = lines.filter(line => line.startsWith("|") && line.endsWith("|"));
      
      // All table lines should have same number of pipes
      const pipeCounts = tableLines.map(line => (line.match(/\|/g) || []).length);
      const firstCount = pipeCounts[0];
      
      pipeCounts.forEach(count => {
        expect(count).toBe(firstCount);
      });
    });
  });

  describe("data source identification", () => {
    test("should include data source ID in query summary", async () => {
      const pages = [createMockPage("page1", "Test", {})];

      const result = await renderPageListAsTable(
        pages,
        [],
        "my-custom-data-source-id",
        mockSchema,
        false,
        null
      );

      expect(result).toContain("Data Source: `my-custom-data-source-id`");
    });
  });
});
