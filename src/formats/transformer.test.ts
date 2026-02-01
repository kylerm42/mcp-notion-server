/**
 * Unit tests for response format transformer
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { transformResponse, toSummaryFormat } from "./transformer.js";
import { NotionClientWrapper } from "../client/index.js";
import { ListResponse, PageResponse, DataSourceResponse } from "../types/index.js";

// Mock the logger module
vi.mock("../logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock NotionClientWrapper
vi.mock("../client/index.js", () => ({
  NotionClientWrapper: vi.fn(),
}));

// Mock table-renderer module
vi.mock("./table-renderer.js", () => ({
  renderPageListAsTable: vi.fn(async () => "# Mocked Table\n\nTable content"),
}));

describe("transformResponse", () => {
  let mockClient: NotionClientWrapper;
  let mockListResponse: ListResponse;

  beforeEach(() => {
    vi.resetAllMocks();
    mockClient = {
      retrieveDataSource: vi.fn(),
    } as any;

    mockListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Page One" },
                  plain_text: "Page One",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
      ],
      has_more: false,
      next_cursor: null,
    };
  });

  test("should transform to summary format", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
        Status: { id: "status", type: "select", name: "Status" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const result = await transformResponse(
      mockListResponse,
      "ds-1",
      "summary",
      mockClient
    );

    expect(mockClient.retrieveDataSource).toHaveBeenCalledWith("ds-1");
    expect(result).toHaveProperty("summary_mode", true);
    expect(result).toHaveProperty("schema");
  });

  test("should transform to table format", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
        Status: { id: "status", type: "select", name: "Status" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const result = await transformResponse(
      mockListResponse,
      "ds-1",
      "table",
      mockClient,
      ["Title", "Status"]
    );

    expect(mockClient.retrieveDataSource).toHaveBeenCalledWith("ds-1");
    expect(typeof result).toBe("string");
    expect(result).toContain("Mocked Table");
  });

  test("should throw error for unsupported format", async () => {
    await expect(
      transformResponse(
        mockListResponse,
        "ds-1",
        "invalid" as any,
        mockClient
      )
    ).rejects.toThrow("Unsupported format: invalid");
  });
});

describe("toSummaryFormat", () => {
  let mockClient: NotionClientWrapper;

  beforeEach(() => {
    vi.resetAllMocks();
    mockClient = {
      retrieveDataSource: vi.fn(),
    } as any;
  });

  test("should transform list response to summary format", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
        Status: { id: "status", type: "select", name: "Status" },
        Priority: { id: "priority", type: "multi_select", name: "Priority" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Test Page" },
                  plain_text: "Test Page",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
        {
          object: "page",
          id: "page-2",
          created_time: "2025-02-01T11:00:00.000Z",
          last_edited_time: "2025-02-01T13:00:00.000Z",
          url: "https://notion.so/page-2",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Another Page" },
                  plain_text: "Another Page",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
      ],
      has_more: true,
      next_cursor: "cursor-123",
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.object).toBe("list");
    expect(result.summary_mode).toBe(true);
    expect(result.data_source_id).toBe("ds-1");
    expect(result.schema).toEqual({
      Title: { type: "title" },
      Status: { type: "select" },
      Priority: { type: "multi_select" },
    });
    expect(result.result_count).toBe(2);
    expect(result.page_size).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      id: "page-1",
      title: "Test Page",
      url: "https://notion.so/page-1",
      last_edited_time: "2025-02-01T12:00:00.000Z",
    });
    expect(result.results[1]).toEqual({
      id: "page-2",
      title: "Another Page",
      url: "https://notion.so/page-2",
      last_edited_time: "2025-02-01T13:00:00.000Z",
    });
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe("cursor-123");
    expect(result.drill_down_hint).toBe(
      "Use notion_retrieve_page with page.id to get full property values"
    );
  });

  test("should handle pages with no title", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Status: { id: "status", type: "select", name: "Status" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Status: {
              id: "status",
              type: "select",
              select: { id: "1", name: "Active", color: "green" },
            },
          },
        } as PageResponse,
      ],
      has_more: false,
      next_cursor: null,
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.results[0].title).toBe("Untitled");
  });

  test("should handle empty results", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [],
      has_more: false,
      next_cursor: null,
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.result_count).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.schema).toEqual({ Title: { type: "title" } });
  });

  test("should filter out non-page results", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Valid Page" },
                  plain_text: "Valid Page",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
        {
          object: "database",
          id: "db-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          title: [],
          properties: {},
        } as any,
      ],
      has_more: false,
      next_cursor: null,
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.result_count).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("page-1");
  });

  test("should handle schema fetch failure gracefully", async () => {
    (mockClient.retrieveDataSource as any).mockRejectedValue(
      new Error("API Error")
    );

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Page Title" },
                  plain_text: "Page Title",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
      ],
      has_more: false,
      next_cursor: null,
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    // Should still return result with empty schema
    expect(result.schema).toEqual({});
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe("Page Title");
  });

  test("should handle pages with various property types", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
        Status: { id: "status", type: "select", name: "Status" },
        Tags: { id: "tags", type: "multi_select", name: "Tags" },
        Date: { id: "date", type: "date", name: "Date" },
        Number: { id: "number", type: "number", name: "Number" },
        URL: { id: "url", type: "url", name: "URL" },
        Relation: { id: "relation", type: "relation", name: "Relation" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Complex Page" },
                  plain_text: "Complex Page",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
            Status: {
              id: "status",
              type: "select",
              select: { id: "1", name: "Active", color: "green" },
            },
            Tags: {
              id: "tags",
              type: "multi_select",
              multi_select: [
                { id: "1", name: "Tag1", color: "blue" },
                { id: "2", name: "Tag2", color: "red" },
              ],
            },
          },
        } as PageResponse,
      ],
      has_more: false,
      next_cursor: null,
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.schema).toEqual({
      Title: { type: "title" },
      Status: { type: "select" },
      Tags: { type: "multi_select" },
      Date: { type: "date" },
      Number: { type: "number" },
      URL: { type: "url" },
      Relation: { type: "relation" },
    });
    expect(result.results[0].title).toBe("Complex Page");
  });

  test("should preserve pagination metadata", async () => {
    const mockSchema: DataSourceResponse = {
      object: "data_source",
      id: "ds-1",
      type: "data_source",
      properties: {
        Title: { id: "title", type: "title", name: "Title" },
      },
    };

    (mockClient.retrieveDataSource as any).mockResolvedValue(mockSchema);

    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          url: "https://notion.so/page-1",
          parent: { type: "data_source_id", data_source_id: "ds-1" },
          properties: {
            Title: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: { content: "Page" },
                  plain_text: "Page",
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                },
              ],
            },
          },
        } as PageResponse,
      ],
      has_more: true,
      next_cursor: "next-page-cursor",
    };

    const result = await toSummaryFormat(listResponse, mockClient, "ds-1");

    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe("next-page-cursor");
  });
});

describe("JSON column filtering", () => {
  test("should filter properties when columns specified", () => {
    const response = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          url: "https://notion.so/page-1",
          properties: {
            Title: { type: "title", title: [{ text: { content: "Test" } }] },
            Status: { type: "select", select: { name: "Active" } },
            Priority: { type: "select", select: { name: "High" } },
            Tags: { type: "multi_select", multi_select: [] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    // Import the filter function from server.ts
    // For now, we'll test it inline
    const filterJsonResponseColumns = (response: any, columns: string[]): any => {
      if (!response.results || !Array.isArray(response.results)) {
        return response;
      }

      const columnSet = new Set(columns);
      
      return {
        ...response,
        results: response.results.map((page: any) => {
          if (!page.properties || typeof page.properties !== "object") {
            return page;
          }

          const filteredProperties: Record<string, any> = {};
          for (const [propName, propValue] of Object.entries(page.properties)) {
            if (columnSet.has(propName)) {
              filteredProperties[propName] = propValue;
            }
          }

          return {
            ...page,
            properties: filteredProperties,
          };
        }),
      };
    };

    const filtered = filterJsonResponseColumns(response, ["Title", "Status"]);

    expect(filtered.results[0].properties).toHaveProperty("Title");
    expect(filtered.results[0].properties).toHaveProperty("Status");
    expect(filtered.results[0].properties).not.toHaveProperty("Priority");
    expect(filtered.results[0].properties).not.toHaveProperty("Tags");
    expect(Object.keys(filtered.results[0].properties)).toHaveLength(2);
  });

  test("should preserve non-property fields when filtering", () => {
    const response = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          url: "https://notion.so/page-1",
          created_time: "2025-02-01T10:00:00.000Z",
          last_edited_time: "2025-02-01T12:00:00.000Z",
          properties: {
            Title: { type: "title", title: [{ text: { content: "Test" } }] },
            Status: { type: "select", select: { name: "Active" } },
          },
        },
      ],
      has_more: true,
      next_cursor: "cursor-123",
    };

    const filterJsonResponseColumns = (response: any, columns: string[]): any => {
      if (!response.results || !Array.isArray(response.results)) {
        return response;
      }

      const columnSet = new Set(columns);
      
      return {
        ...response,
        results: response.results.map((page: any) => {
          if (!page.properties || typeof page.properties !== "object") {
            return page;
          }

          const filteredProperties: Record<string, any> = {};
          for (const [propName, propValue] of Object.entries(page.properties)) {
            if (columnSet.has(propName)) {
              filteredProperties[propName] = propValue;
            }
          }

          return {
            ...page,
            properties: filteredProperties,
          };
        }),
      };
    };

    const filtered = filterJsonResponseColumns(response, ["Title"]);

    expect(filtered.results[0].id).toBe("page-1");
    expect(filtered.results[0].url).toBe("https://notion.so/page-1");
    expect(filtered.results[0].created_time).toBe("2025-02-01T10:00:00.000Z");
    expect(filtered.results[0].last_edited_time).toBe("2025-02-01T12:00:00.000Z");
    expect(filtered.has_more).toBe(true);
    expect(filtered.next_cursor).toBe("cursor-123");
  });

  test("should handle empty columns array", () => {
    const response = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          properties: {
            Title: { type: "title", title: [{ text: { content: "Test" } }] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    const filterJsonResponseColumns = (response: any, columns: string[]): any => {
      if (!response.results || !Array.isArray(response.results)) {
        return response;
      }

      const columnSet = new Set(columns);
      
      return {
        ...response,
        results: response.results.map((page: any) => {
          if (!page.properties || typeof page.properties !== "object") {
            return page;
          }

          const filteredProperties: Record<string, any> = {};
          for (const [propName, propValue] of Object.entries(page.properties)) {
            if (columnSet.has(propName)) {
              filteredProperties[propName] = propValue;
            }
          }

          return {
            ...page,
            properties: filteredProperties,
          };
        }),
      };
    };

    const filtered = filterJsonResponseColumns(response, []);

    expect(filtered.results[0].properties).toEqual({});
  });

  test("should handle non-existent columns gracefully", () => {
    const response = {
      object: "list",
      results: [
        {
          object: "page",
          id: "page-1",
          properties: {
            Title: { type: "title", title: [{ text: { content: "Test" } }] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    };

    const filterJsonResponseColumns = (response: any, columns: string[]): any => {
      if (!response.results || !Array.isArray(response.results)) {
        return response;
      }

      const columnSet = new Set(columns);
      
      return {
        ...response,
        results: response.results.map((page: any) => {
          if (!page.properties || typeof page.properties !== "object") {
            return page;
          }

          const filteredProperties: Record<string, any> = {};
          for (const [propName, propValue] of Object.entries(page.properties)) {
            if (columnSet.has(propName)) {
              filteredProperties[propName] = propValue;
            }
          }

          return {
            ...page,
            properties: filteredProperties,
          };
        }),
      };
    };

    const filtered = filterJsonResponseColumns(response, ["NonExistent", "AlsoNotThere"]);

    expect(filtered.results[0].properties).toEqual({});
  });

  test("should handle response with no results", () => {
    const response = {
      object: "list",
      results: [],
      has_more: false,
      next_cursor: null,
    };

    const filterJsonResponseColumns = (response: any, columns: string[]): any => {
      if (!response.results || !Array.isArray(response.results)) {
        return response;
      }

      const columnSet = new Set(columns);
      
      return {
        ...response,
        results: response.results.map((page: any) => {
          if (!page.properties || typeof page.properties !== "object") {
            return page;
          }

          const filteredProperties: Record<string, any> = {};
          for (const [propName, propValue] of Object.entries(page.properties)) {
            if (columnSet.has(propName)) {
              filteredProperties[propName] = propValue;
            }
          }

          return {
            ...page,
            properties: filteredProperties,
          };
        }),
      };
    };

    const filtered = filterJsonResponseColumns(response, ["Title"]);

    expect(filtered.results).toEqual([]);
  });
});
