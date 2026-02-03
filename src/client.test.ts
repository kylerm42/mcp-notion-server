import { expect, test, describe, vi, beforeEach } from "vitest";
import { NotionClientWrapper } from "./client/index.js";
import { PageResponse } from "./types/index.js";
import { filterTools } from "./utils/index.js";
import fetch from "node-fetch";

vi.mock("./markdown/index.js", () => ({
  convertToMarkdown: vi.fn().mockReturnValue("# Test"),
}));

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

// Mock tool list
const mockInputSchema = { type: "object" as const };
const mockTools = [
  {
    name: "retrieve_block",
    inputSchema: mockInputSchema,
  },
  {
    name: "retrieve_page",
    inputSchema: mockInputSchema,
  },
  {
    name: "query_data_source",
    inputSchema: mockInputSchema,
  },
];

describe("NotionClientWrapper", () => {
  let wrapper: any;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create client wrapper with test token
    wrapper = new NotionClientWrapper("test-token");

    // Mock fetch to return JSON
    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  test("should initialize with correct headers", () => {
    expect((wrapper as any).headers).toEqual({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03",
    });
  });

  test("should call appendBlockChildren with correct parameters", async () => {
    const blockId = "block123";
    const children = [{ type: "paragraph" }];

    await wrapper.appendBlockChildren(blockId, children);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ children }),
      }
    );
  });

  test("should call retrieveBlock with correct parameters", async () => {
    const blockId = "block123";

    await wrapper.retrieveBlock(blockId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call retrieveBlockChildren with pagination parameters", async () => {
    const blockId = "block123";
    const startCursor = "cursor123";
    const pageSize = 10;

    await wrapper.retrieveBlockChildren(blockId, startCursor, pageSize);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children?start_cursor=${startCursor}&page_size=${pageSize}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call retrievePage with correct parameters", async () => {
    const pageId = "page123";

    await wrapper.retrievePage(pageId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call updatePageProperties with correct parameters", async () => {
    const pageId = "page123";
    const properties = {
      title: { title: [{ text: { content: "New Title" } }] },
    };

    await wrapper.updatePageProperties(pageId, properties);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ properties }),
      }
    );
  });

  test("should call queryDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const filter = { property: "Status", equals: "Done" };
    const sorts = [{ property: "Due Date", direction: "ascending" }];

    await wrapper.queryDataSource(dataSourceId, filter, sorts);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ filter, sorts }),
      }
    );
  });

  test("should call search with correct parameters", async () => {
    const query = "test query";
    const filter = { property: "object", value: "page" };

    await wrapper.search(query, filter);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/search",
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ query, filter }),
      }
    );
  });

  test("should call retrieveDatabase with correct parameters", async () => {
    const databaseId = "db123";

    await wrapper.retrieveDatabase(databaseId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call retrieveDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";

    await wrapper.retrieveDataSource(dataSourceId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call updateDatabase with correct parameters", async () => {
    const databaseId = "db123";
    const title = [{ type: "text", text: { content: "New Title" } }];
    const icon = { type: "emoji", emoji: "📚" };

    await wrapper.updateDatabase(databaseId, title, icon);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ title, icon }),
      }
    );
  });

  test("should call updateDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = {
      Status: { type: "select", select: { options: [] } },
    };
    const title = [{ type: "text", text: { content: "Primary Data Source" } }];

    await wrapper.updateDataSource(dataSourceId, properties, title);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ properties, title }),
      }
    );
  });

  test("should call createDataSourceItem with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = {
      Name: { title: [{ text: { content: "New Item" } }] },
    };

    await wrapper.createDataSourceItem(dataSourceId, properties);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/pages",
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({
          parent: { type: "data_source_id", data_source_id: dataSourceId },
          properties,
        }),
      }
    );
  });

  test("should call createDatabase with correct parameters", async () => {
    const parent = { type: "page_id", page_id: "page123" };
    const properties = {
      Name: { title: {} },
    };
    const title = [{ type: "text", text: { content: "New Database" } }];

    await wrapper.createDatabase(parent, properties, title);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/databases",
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({
          parent,
          initial_data_source: { properties },
          title,
        }),
      }
    );
  });

  test("should call toMarkdown method correctly", async () => {
    const { convertToMarkdown } = await import("./markdown/index.js");

    const response: PageResponse = {
      object: "page",
      id: "test",
      created_time: "2021-01-01T00:00:00.000Z",
      last_edited_time: "2021-01-01T00:00:00.000Z",
      parent: {
        type: "workspace",
      },
      properties: {},
    };
    await wrapper.toMarkdown(response);

    expect(convertToMarkdown).toHaveBeenCalledWith(response);
  });

  describe("filterTools", () => {
    test("should return all tools when no filter specified", () => {
      const result = filterTools(mockTools);
      expect(result).toEqual(mockTools);
    });

    test("should filter tools based on enabledTools", () => {
      const enabledToolsSet = new Set([
        "retrieve_block",
        "query_data_source",
      ]);
      const result = filterTools(mockTools, enabledToolsSet);
      expect(result).toEqual([
        { name: "retrieve_block", inputSchema: mockInputSchema },
        { name: "query_data_source", inputSchema: mockInputSchema },
      ]);
    });

    test("should return empty array when no tools match", () => {
      const enabledToolsSet = new Set(["non_existent_tool"]);
      const result = filterTools(mockTools, enabledToolsSet);
      expect(result).toEqual([]);
    });
  });
});

/**
 * MANUAL INTEGRATION TESTING CHECKLIST (Task 6.3)
 * 
 * These tests require manual execution with MCP Inspector:
 * 
 * 1. Query data source by ID
 *    - Use notion_query_data_source with a valid data_source_id
 *    - Verify response contains pages from the data source
 * 
 * 2. Retrieve database to get data source list
 *    - Use notion_retrieve_database with a database_id
 *    - Verify response includes data_sources[] array
 *    - Verify each data source has id and name properties
 * 
 * 3. Retrieve specific data source schema
 *    - Use notion_retrieve_data_source with a data_source_id
 *    - Verify response includes properties schema
 * 
 * 4. Create database with initial data source
 *    - Use notion_create_database with parent, properties
 *    - Verify response includes database metadata
 *    - Verify data_sources[] contains initial data source
 * 
 * 5. Create item in data source
 *    - Use notion_create_data_source_item with data_source_id
 *    - Verify page created with correct parent type: data_source_id
 * 
 * 6. Update database properties
 *    - Use notion_update_database with title, icon, or cover
 *    - Verify only database-level properties are updated
 * 
 * 7. Update data source schema
 *    - Use notion_update_data_source with properties
 *    - Verify schema updated without affecting database properties
 * 
 * 8. Search for data sources
 *    - Use notion_search with filter: {property: "object", value: "data_source"}
 *    - Verify results contain data source objects
 * 
 * Run manual tests with: npm run inspector
 */
