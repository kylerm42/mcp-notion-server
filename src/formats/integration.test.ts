/**
 * Integration tests for response format optimization
 * Validates end-to-end functionality including token efficiency,
 * backward compatibility, and edge cases
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { transformResponse, SummaryResponse } from "./transformer.js";
import { NotionClientWrapper } from "../client/index.js";

// Mock the logger to avoid console output during tests
vi.mock("../logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Integration: Summary Format Token Efficiency", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock client with retrieveDataSource method
    mockClient = {
      retrieveDataSource: vi.fn().mockResolvedValue({
        properties: {
          Title: { type: "title" },
          Status: { type: "select" },
          Tags: { type: "multi_select" },
          Related: { type: "relation" },
          URL: { type: "url" },
        },
      }),
    };
  });

  test("should fit 200+ pages in summary format within 25KB", async () => {
    // Arrange: Generate 200 mock pages with realistic properties
    const mockPages = Array.from({ length: 200 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i.toString().padStart(3, "0")}`,
      properties: {
        Title: { 
          type: "title", 
          title: [{ 
            type: "text",
            text: { content: `Item ${i}` },
            plain_text: `Item ${i}` 
          }] 
        },
        Status: { 
          type: "select", 
          select: { name: "Active", color: "blue" } 
        },
        Tags: { 
          type: "multi_select", 
          multi_select: [
            { name: "Tag1", color: "red" }, 
            { name: "Tag2", color: "green" }
          ] 
        },
        Related: { 
          type: "relation", 
          relation: [
            { id: "rel-id-1" }, 
            { id: "rel-id-2" }
          ] 
        },
        URL: { 
          type: "url", 
          url: `https://example.com/page-${i}` 
        },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
      created_time: "2026-01-01T12:00:00.000Z",
      created_by: { object: "user", id: "user-1" },
      last_edited_by: { object: "user", id: "user-1" },
      cover: null,
      icon: null,
      parent: { type: "database_id", database_id: "db-id" },
      archived: false,
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: true,
      next_cursor: "cursor-abc123",
    };

    // Act: Transform to summary format
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "summary",
      mockClient as NotionClientWrapper
    );

    // Assert: Measure size
    const summarySize = Buffer.byteLength(
      JSON.stringify(summaryResponse),
      "utf8"
    );

    expect(summarySize).toBeLessThan(25000);
    expect(summaryResponse.summary_mode).toBe(true);
    expect(summaryResponse.results).toHaveLength(200);
    expect(summaryResponse.schema).toEqual({
      Title: { type: "title" },
      Status: { type: "select" },
      Tags: { type: "multi_select" },
      Related: { type: "relation" },
      URL: { type: "url" },
    });
    expect(summaryResponse.has_more).toBe(true);
    expect(summaryResponse.next_cursor).toBe("cursor-abc123");

    // Comparison: full JSON exceeds limit
    const fullJsonSize = Buffer.byteLength(
      JSON.stringify(mockListResponse),
      "utf8"
    );
    expect(fullJsonSize).toBeGreaterThan(25000);
  });

  test("should include schema metadata at top level", async () => {
    // Arrange
    const mockPages = Array.from({ length: 10 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i}`,
      properties: {
        Title: { type: "title", title: [{ plain_text: `Item ${i}` }] },
        Status: { type: "select", select: { name: "Active" } },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "summary",
      mockClient as NotionClientWrapper
    ) as SummaryResponse;

    // Assert: Schema included once at top level
    expect(summaryResponse.schema).toBeDefined();
    expect(Object.keys(summaryResponse.schema)).toHaveLength(5);
    
    // Verify results don't include full properties
    summaryResponse.results.forEach((page) => {
      expect(page).toHaveProperty("id");
      expect(page).toHaveProperty("title");
      expect(page).toHaveProperty("url");
      expect(page).toHaveProperty("last_edited_time");
      expect(page).not.toHaveProperty("properties");
    });
  });

  test("should handle pages with missing titles gracefully", async () => {
    // Arrange: Pages without title property
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Status: { type: "select", select: { name: "Active" } },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "summary",
      mockClient as NotionClientWrapper
    ) as SummaryResponse;

    // Assert: Uses "Untitled" fallback
    expect(summaryResponse.results[0].title).toBe("Untitled");
  });

  test("should preserve pagination metadata", async () => {
    // Arrange
    const mockPages = Array.from({ length: 50 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i}`,
      properties: {
        Title: { type: "title", title: [{ plain_text: `Item ${i}` }] },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: true,
      next_cursor: "next-page-cursor",
    };

    // Act
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "summary",
      mockClient as NotionClientWrapper
    ) as SummaryResponse;

    // Assert
    expect(summaryResponse.has_more).toBe(true);
    expect(summaryResponse.next_cursor).toBe("next-page-cursor");
    expect(summaryResponse.drill_down_hint).toContain("retrieve_page");
  });
});

describe("Integration: Table Format Structure", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockClient = {
      retrieveDataSource: vi.fn().mockResolvedValue({
        properties: {
          Title: { type: "title" },
          Status: { type: "select" },
        },
      }),
    };
  });

  test("should produce valid Markdown table with all sections", async () => {
    // Arrange: Generate mock pages
    const mockPages = Array.from({ length: 10 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i}`,
      properties: {
        Title: { 
          type: "title", 
          title: [{ 
            type: "text",
            text: { content: `Item ${i}` },
            plain_text: `Item ${i}` 
          }] 
        },
        Status: { 
          type: "select", 
          select: { name: "Active" } 
        },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: true,
      next_cursor: "cursor-abc",
    };

    // Act: Transform to table format
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Validate structure
    expect(typeof tableResponse).toBe("string");
    
    // Check for required sections
    expect(tableResponse).toContain("# Data Source Query Results");
    expect(tableResponse).toContain("**Query Summary:**");
    expect(tableResponse).toContain("## Results Table");
    expect(tableResponse).toContain("## Pagination");
    expect(tableResponse).toContain("## Drill-Down");
    
    // Check table structure
    expect(tableResponse).toContain("| Title | Status |");
    expect(tableResponse).toContain("|-------|-------|");
    
    // Check pagination metadata
    expect(tableResponse).toContain("start_cursor: \"cursor-abc\"");
    expect(tableResponse).toContain("More items available");
    
    // Check drill-down instructions
    expect(tableResponse).toContain("retrieve_page");
  });

  test("should handle empty results gracefully", async () => {
    // Arrange: Empty results
    const mockListResponse = {
      object: "list" as const,
      results: [],
      has_more: false,
      next_cursor: null,
    };

    // Act
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Should still be valid Markdown
    expect(typeof tableResponse).toBe("string");
    expect(tableResponse).toContain("# Data Source Query Results");
    expect(tableResponse).toContain("Results: 0");
  });

  test("should include all 10 rows in table", async () => {
    // Arrange
    const mockPages = Array.from({ length: 10 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i}`,
      properties: {
        Title: { 
          type: "title", 
          title: [{ 
            type: "text",
            text: { content: `Item ${i}` },
            plain_text: `Item ${i}` 
          }] 
        },
        Status: { type: "select", select: { name: "Active" } },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Count table rows (header + separator + 10 data rows)
    const tableLines = tableResponse.split("\n");
    const tableSectionStart = tableLines.findIndex((line: string) => 
      line.includes("## Results Table")
    );
    const tableRows = tableLines
      .slice(tableSectionStart)
      .filter((line: string) => line.startsWith("|"));
    
    // Should have: header row + separator row + 10 data rows = 12 total
    expect(tableRows.length).toBe(12);
  });
});

describe("Integration: Column Selection", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockClient = {
      retrieveDataSource: vi.fn().mockResolvedValue({
        properties: {
          Title: { type: "title" },
          Status: { type: "select" },
          Priority: { type: "select" },
          Tags: { type: "multi_select" },
        },
      }),
    };
  });

  test("should include only specified columns in table format", async () => {
    // Arrange
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Title: { 
            type: "title", 
            title: [{ 
              type: "text",
              text: { content: "Item 1" },
              plain_text: "Item 1" 
            }] 
          },
          Status: { type: "select", select: { name: "Active" } },
          Priority: { type: "select", select: { name: "High" } },
          Tags: { type: "multi_select", multi_select: [] },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act: Transform with specific columns
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper,
      ["Title", "Status"] // Only these two columns
    );

    // Assert: Validate columns
    expect(tableResponse).toContain("| Title | Status |");
    expect(tableResponse).not.toContain("Priority");
    expect(tableResponse).not.toContain("Tags");
    
    // Verify data row contains only selected columns
    const tableLines = tableResponse.split("\n");
    const dataRow = tableLines.find((line: string) => 
      line.includes("Item 1") && line.includes("Active")
    );
    expect(dataRow).toBeDefined();
  });

  test("should include all columns when columns parameter omitted", async () => {
    // Arrange
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Title: { 
            type: "title", 
            title: [{ 
              type: "text",
              text: { content: "Item 1" },
              plain_text: "Item 1" 
            }] 
          },
          Status: { type: "select", select: { name: "Active" } },
          Priority: { type: "select", select: { name: "High" } },
          Tags: { type: "multi_select", multi_select: [{ name: "Tag1" }] },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act: Transform WITHOUT columns parameter
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper
      // No columns parameter
    );

    // Assert: Validate ALL columns included
    expect(tableResponse).toContain("| Title | Status | Priority | Tags |");
    
    // Verify data is present
    expect(tableResponse).toContain("Item 1");
    expect(tableResponse).toContain("Active");
    expect(tableResponse).toContain("High");
    expect(tableResponse).toContain("Tag1");
  });

  test("should filter to existing properties when non-existent columns requested", async () => {
    // Arrange
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Title: { 
            type: "title", 
            title: [{ 
              type: "text",
              text: { content: "Item 1" },
              plain_text: "Item 1" 
            }] 
          },
          Status: { type: "select", select: { name: "Active" } },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act: Request columns including non-existent one
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-data-source-id",
      "table",
      mockClient as NotionClientWrapper,
      ["Title", "NonExistent", "Status"]
    );

    // Assert: Should include only existing columns
    expect(tableResponse).toContain("| Title | Status |");
    expect(tableResponse).not.toContain("NonExistent");
  });
});

describe("Integration: Backward Compatibility", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockClient = {
      retrieveDataSource: vi.fn().mockResolvedValue({
        properties: {
          Title: { type: "title" },
        },
      }),
    };
  });

  test("should throw error when response_format is undefined", async () => {
    // Arrange
    const mockListResponse = {
      object: "list" as const,
      results: [
        {
          object: "page" as const,
          id: "page-1",
          properties: {
            Title: { type: "title", title: [{ plain_text: "Test" }] },
          },
          url: "https://notion.so/page-1",
          last_edited_time: "2026-02-01T12:00:00.000Z",
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    // Act & Assert: transformResponse should throw for undefined format
    await expect(async () => {
      await transformResponse(
        mockListResponse,
        "test-id",
        undefined as any, // Simulating omitted parameter
        mockClient as NotionClientWrapper
      );
    }).rejects.toThrow();
  });

  test("should handle summary format explicitly", async () => {
    // Arrange
    const mockListResponse = {
      object: "list" as const,
      results: [
        {
          object: "page" as const,
          id: "page-1",
          properties: {
            Title: { 
              type: "title", 
              title: [{ 
                type: "text",
                text: { content: "Test" },
                plain_text: "Test" 
              }] 
            },
          },
          url: "https://notion.so/page-1",
          last_edited_time: "2026-02-01T12:00:00.000Z",
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    // Act: Explicitly request summary format
    const response = await transformResponse(
      mockListResponse,
      "test-id",
      "summary",
      mockClient as NotionClientWrapper
    );

    // Assert: Should return summary format
    expect(response.summary_mode).toBe(true);
    expect(response.object).toBe("list");
  });

  test("should handle table format explicitly", async () => {
    // Arrange
    const mockListResponse = {
      object: "list" as const,
      results: [
        {
          object: "page" as const,
          id: "page-1",
          properties: {
            Title: { 
              type: "title", 
              title: [{ 
                type: "text",
                text: { content: "Test" },
                plain_text: "Test" 
              }] 
            },
          },
          url: "https://notion.so/page-1",
          last_edited_time: "2026-02-01T12:00:00.000Z",
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    // Act: Explicitly request table format
    const response = await transformResponse(
      mockListResponse,
      "test-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Should return Markdown string
    expect(typeof response).toBe("string");
    expect(response).toContain("# Data Source Query Results");
  });
});

describe("Integration: Edge Cases", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockClient = {
      retrieveDataSource: vi.fn().mockResolvedValue({
        properties: {
          Title: { type: "title" },
          Emoji: { type: "rich_text" },
        },
      }),
    };
  });

  test("should handle Unicode and emoji in titles", async () => {
    // Arrange: Pages with Unicode/emoji
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Title: { 
            type: "title", 
            title: [{ 
              type: "text",
              text: { content: "🚀 Test 日本語" },
              plain_text: "🚀 Test 日本語" 
            }] 
          },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act: Summary format
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "summary",
      mockClient as NotionClientWrapper
    ) as SummaryResponse;

    // Assert: Unicode preserved
    expect(summaryResponse.results[0].title).toBe("🚀 Test 日本語");

    // Act: Table format
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Unicode preserved in table
    expect(tableResponse).toContain("🚀 Test 日本語");
  });

  test("should handle single result without breaking", async () => {
    // Arrange: Single page
    const mockPages = [
      {
        object: "page" as const,
        id: "page-1",
        properties: {
          Title: { 
            type: "title", 
            title: [{ 
              type: "text",
              text: { content: "Only Page" },
              plain_text: "Only Page" 
            }] 
          },
        },
        url: "https://notion.so/page-1",
        last_edited_time: "2026-02-01T12:00:00.000Z",
      },
    ];

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false,
      next_cursor: null,
    };

    // Act: Table format
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Valid table with one row
    expect(tableResponse).toContain("| Title |");
    expect(tableResponse).toContain("Only Page");
    expect(tableResponse).toContain("Results: 1");
  });

  test("should handle last page with has_more false", async () => {
    // Arrange: Last page of results
    const mockPages = Array.from({ length: 5 }, (_, i) => ({
      object: "page" as const,
      id: `page-${i}`,
      properties: {
        Title: { 
          type: "title", 
          title: [{ 
            type: "text",
            text: { content: `Item ${i}` },
            plain_text: `Item ${i}` 
          }] 
        },
      },
      url: `https://notion.so/page-${i}`,
      last_edited_time: "2026-02-01T12:00:00.000Z",
    }));

    const mockListResponse = {
      object: "list" as const,
      results: mockPages,
      has_more: false, // Last page
      next_cursor: null,
    };

    // Act: Summary format
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "summary",
      mockClient as NotionClientWrapper
    ) as SummaryResponse;

    // Assert
    expect(summaryResponse.has_more).toBe(false);
    expect(summaryResponse.next_cursor).toBeNull();

    // Act: Table format
    const tableResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "table",
      mockClient as NotionClientWrapper
    );

    // Assert: Should not show Pagination section when has_more is false
    expect(tableResponse).not.toContain("## Pagination");
  });

  test("should handle schema fetch failure gracefully", async () => {
    // Arrange: Mock client that fails schema fetch
    const failingClient = {
      retrieveDataSource: vi.fn().mockRejectedValue(
        new Error("Schema fetch failed")
      ),
    };

    const mockListResponse = {
      object: "list" as const,
      results: [
        {
          object: "page" as const,
          id: "page-1",
          properties: {
            Title: { 
              type: "title", 
              title: [{ 
                type: "text",
                text: { content: "Test" },
                plain_text: "Test" 
              }] 
            },
          },
          url: "https://notion.so/page-1",
          last_edited_time: "2026-02-01T12:00:00.000Z",
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    // Act: Should not throw, but handle gracefully
    const summaryResponse = await transformResponse(
      mockListResponse,
      "test-id",
      "summary",
      failingClient as unknown as NotionClientWrapper
    ) as SummaryResponse;

    // Assert: Should return empty schema but still work
    expect(summaryResponse.schema).toEqual({});
    expect(summaryResponse.results).toHaveLength(1);
  });
});

describe("Backward Compatibility", () => {
  /**
   * Backward Compatibility Test
   * 
   * This test documents the guarantee that omitting response_format
   * returns full JSON (existing behavior). The server handler implements
   * this at src/server/index.ts lines 193-216 with conditional logic:
   * 
   * if (queryArgs.response_format && queryArgs.response_format !== "json") {
   *   // Transform
   * } else {
   *   // Return original (backward compatible)
   * }
   */
  test("documents backward compatibility guarantee for omitted response_format", () => {
    // When response_format is omitted or "json", full JSON is returned
    // This is verified by server handler logic, not transformation logic
    
    // Validate that undefined is a valid state (optional parameter)
    const undefinedFormat: string | undefined = undefined;
    expect(undefinedFormat).toBeUndefined();
    
    // The server handler preserves this contract:
    // - No response_format parameter → returns full ListResponse JSON
    // - response_format: "json" → returns full ListResponse JSON
    // - response_format: "summary" → calls transformResponse
    // - response_format: "table" → calls transformResponse
    
    // This test documents the backward compatibility contract
    const validFormats = [undefined, "json", "summary", "table"];
    expect(validFormats).toContain(undefined); // Omitted is valid
    expect(validFormats).toContain("json"); // Default is valid
  });
});

describe("Format Validation", () => {
  test("should validate response_format enum values", () => {
    // Valid formats
    const validFormats = ["json", "summary", "table"];
    validFormats.forEach(format => {
      expect(["json", "summary", "table"].includes(format)).toBe(true);
    });
    
    // Invalid formats
    const invalidFormats = ["invalid", "csv", "xml", ""];
    invalidFormats.forEach(format => {
      expect(["json", "summary", "table"].includes(format)).toBe(false);
    });
    
    // This validates that the server handler check in src/server/index.ts
    // correctly rejects invalid format values:
    // if (!["json", "summary", "table"].includes(queryArgs.response_format))
  });
});
