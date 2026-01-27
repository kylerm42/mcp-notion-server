# Notion MCP Server

MCP Server for the Notion API, enabling LLM to interact with Notion workspaces. Additionally, it employs Markdown conversion to reduce context size when communicating with LLMs, optimizing token usage and making interactions more efficient.

## Setup

Here is a detailed explanation of the steps mentioned above in the following articles:

- English Version: https://dev.to/suekou/operating-notion-via-claude-desktop-using-mcp-c0h
- Japanese Version: https://qiita.com/suekou/items/44c864583f5e3e6325d9

1. **Create a Notion Integration**:

   - Visit the [Notion Your Integrations page](https://www.notion.so/profile/integrations).
   - Click "New Integration".
   - Name your integration and select appropriate permissions (e.g., "Read content", "Update content").

2. **Retrieve the Secret Key**:

   - Copy the "Internal Integration Token" from your integration.
   - This token will be used for authentication.

3. **Add the Integration to Your Workspace**:

   - Open the page or database you want the integration to access in Notion.
   - Click the "···" button in the top right corner.
   - Click the "Connections" button, and select the the integration you created in step 1 above.

4. **Configure Claude Desktop**:
   Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token"
      }
    }
  }
}
```

or

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["your-built-file-path"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token"
      }
    }
  }
}
```

## Environment Variables

- `NOTION_API_TOKEN` (required): Your Notion API integration token.
- `NOTION_MARKDOWN_CONVERSION`: Set to "true" to enable experimental Markdown conversion. This can significantly reduce token consumption when viewing content, but may cause issues when trying to edit page content.

## Command Line Arguments

- `--enabledTools`: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_database"). When specified, only the listed tools will be available. If not specified, all tools are enabled.

Read-only tools example (copy-paste friendly):

```bash
node build/index.js --enabledTools=notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_query_data_source,notion_retrieve_database,notion_retrieve_data_source,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments
```

## Advanced Configuration

### Markdown Conversion

By default, all responses are returned in JSON format. You can enable experimental Markdown conversion to reduce token consumption:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
```

or

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["your-built-file-path"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
```

When `NOTION_MARKDOWN_CONVERSION` is set to `"true"`, responses will be converted to Markdown format (when `format` parameter is set to `"markdown"`), making them more human-readable and significantly reducing token consumption. However, since this feature is experimental, it may cause issues when trying to edit page content as the original structure is lost in conversion.

You can control the format on a per-request basis by setting the `format` parameter to either `"json"` or `"markdown"` in your tool calls:

- Use `"markdown"` for better readability when only viewing content
- Use `"json"` when you need to modify the returned content

## Understanding Data Sources (API Version 2025-09-03)

As of API version 2025-09-03, Notion introduced the **data source** concept:

- **Databases** are containers that hold one or more **data sources**
- **Data sources** are the actual collections of pages/items within a database
- Each data source has its own schema (set of properties)
- Most databases have a single data source, but advanced setups may have multiple

### Key Implications

**For querying and creating items:**
- Use `data_source_id`, not `database_id`
- Tools: `notion_query_data_source`, `notion_create_data_source_item`

**For database metadata:**
- Use `database_id` for database-level operations
- Tools: `notion_retrieve_database`, `notion_update_database`

### How to Get Data Source IDs

**Option 1: Via API (Recommended)**
```typescript
// Retrieve database to get list of data sources
const db = await tools.notion_retrieve_database({
  database_id: "your-database-id"
});

// Extract the data source ID
const dataSourceId = db.data_sources[0].id;  // First data source
// OR find by name:
const dataSourceId = db.data_sources.find(ds => ds.name === "Primary")?.id;
```

**Option 2: Via Notion UI**
1. Open your database in Notion
2. Click "⋮⋮⋮" → Settings → Manage data sources
3. Click "Copy data source ID"

**Typical Workflow:**
```typescript
// Step 1: Discover the data source ID (do once, then cache it)
const db = await tools.notion_retrieve_database({ database_id: "abc123" });
const DS_ID = db.data_sources[0].id;  // Save this!

// Step 2: Use the data source ID for queries and item creation
const results = await tools.notion_query_data_source({
  data_source_id: DS_ID,
  filter: { property: "Status", select: { equals: "Active" } }
});

await tools.notion_create_data_source_item({
  data_source_id: DS_ID,
  properties: { "Name": { title: [{ text: { content: "New Item" } }] } }
});
```

## Troubleshooting

### Permission Errors

If you encounter permission errors:

1. Ensure the integration has the required permissions.
2. Verify that the integration is invited to the relevant pages or databases.
3. Confirm the token and configuration are correctly set in `claude_desktop_config.json`.

### Migration Issues (API Version Upgrade)

If you recently upgraded from an older version of this server:

**"I don't have a data source ID, only a database ID"**
- Call `notion_retrieve_database` with your database ID
- The response includes a `data_sources` array with IDs and names
- Use the `id` field from the data source you want to target

**"My queries are failing after upgrade"**
- Check if you're using the correct tool name: `notion_query_data_source` (not `notion_query_database`)
- Ensure you're passing `data_source_id`, not `database_id`
- Verify the ID is a data source ID (starts with `ds-` typically), not a database ID

**"What happened to notion_query_database?"**
- Renamed to `notion_query_data_source` to reflect the new API paradigm
- See [MIGRATION.md](./MIGRATION.md) for a complete migration guide

**"Tool not found" errors**
- Old tool names are no longer available
- See the [Quick Reference table in MIGRATION.md](./MIGRATION.md#quick-reference-tool-renames) for name mappings

## Project Structure

The project is organized in a modular way to improve maintainability and readability:

```
./
├── src/
│   ├── index.ts              # Entry point and command-line handling
│   ├── client/
│   │   └── index.ts          # NotionClientWrapper class for API interactions
│   ├── server/
│   │   └── index.ts          # MCP server setup and request handling
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── args.ts           # Tool argument interfaces
│   │   ├── common.ts         # Common schema definitions
│   │   ├── responses.ts      # API response type definitions
│   │   └── schemas.ts        # Tool schema definitions
│   ├── utils/
│   │   └── index.ts          # Utility functions
│   └── markdown/
│       └── index.ts          # Markdown conversion utilities
```

### Directory Descriptions

- **index.ts**: Application entry point. Parses command-line arguments and starts the server.
- **client/**: Module responsible for communication with the Notion API.
  - **index.ts**: NotionClientWrapper class implements all API calls.
- **server/**: MCP server implementation.
  - **index.ts**: Processes requests received from Claude and calls appropriate client methods.
- **types/**: Type definition module.
  - **index.ts**: Exports for all types.
  - **args.ts**: Interface definitions for tool arguments.
  - **common.ts**: Definitions for common schemas (ID formats, rich text, etc.).
  - **responses.ts**: Type definitions for Notion API responses.
  - **schemas.ts**: Definitions for MCP tool schemas.
- **utils/**: Utility functions.
  - **index.ts**: Functions like filtering enabled tools.
- **markdown/**: Markdown conversion functionality.
  - **index.ts**: Logic for converting JSON responses to Markdown format.

## Tools

All tools support the following optional parameter:

- `format` (string, "json" or "markdown", default: "markdown"): Controls the response format. Use "markdown" for human-readable output, "json" for programmatic access to the original data structure. Note: Markdown conversion only works when the `NOTION_MARKDOWN_CONVERSION` environment variable is set to "true".

1. `notion_append_block_children`

   - Append child blocks to a parent block.
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
     - `children` (array): Array of block objects to append.
   - Returns: Information about the appended blocks.

2. `notion_retrieve_block`

   - Retrieve information about a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to retrieve.
   - Returns: Detailed information about the block.

3. `notion_retrieve_block_children`

   - Retrieve the children of a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
   - Optional inputs:
     - `start_cursor` (string): Cursor for the next page of results.
     - `page_size` (number, default: 100, max: 100): Number of blocks to retrieve.
   - Returns: List of child blocks.

4. `notion_delete_block`

   - Delete a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to delete.
   - Returns: Confirmation of the deletion.

5. `notion_retrieve_page`

   - Retrieve information about a specific page.
   - Required inputs:
     - `page_id` (string): The ID of the page to retrieve.
   - Returns: Detailed information about the page.

6. `notion_update_page_properties`

   - Update properties of a page.
   - Required inputs:
     - `page_id` (string): The ID of the page to update.
     - `properties` (object): Properties to update.
   - Returns: Information about the updated page.

7. `notion_create_database`

   - Create a new database with an initial data source for storing pages.
   - Required inputs:
     - `parent` (object): Parent object of the database (page_id, database_id, or workspace).
     - `properties` (object): Property schema for the initial data source. For relation properties, use `data_source_id` (not `database_id`).
   - Optional inputs:
     - `title` (array): Title of the database as a rich text array.
     - `icon` (object): Icon object for the database (emoji or external/file URL).
     - `cover` (object): Cover image object for the database.
   - Returns: Information about the created database including the initial data source.

8. `notion_query_data_source`

   - Query a data source in Notion to retrieve pages with filtering and sorting.
   - Required inputs:
     - `data_source_id` (string): The ID of the data source to query.
   - Optional inputs:
     - `filter` (object): Filter conditions for querying pages.
     - `sorts` (array): Sort conditions for ordering query results.
     - `start_cursor` (string): Pagination cursor for next page of results.
     - `page_size` (number, default: 100, max: 100): Number of results to retrieve.
   - Returns: List of pages from the data source matching the query.
   - Note: Use `notion_retrieve_database` first to get the `data_source_id` from a database.

9. `notion_retrieve_database`

   - Retrieve database metadata including list of available data sources.
   - Required inputs:
     - `database_id` (string): The ID of the database to retrieve.
   - Returns: Database information including `data_sources` array with IDs and names.
   - Use this to discover data source IDs for query and create operations.

10. `notion_retrieve_data_source`

    - Retrieve data source schema and metadata.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to retrieve.
    - Returns: Detailed schema information for the data source including properties configuration.

11. `notion_update_database`

    - Update database-level properties such as title, icon, cover, parent, and inline status.
    - Required inputs:
      - `database_id` (string): The ID of the database to update.
    - Optional inputs:
      - `title` (array): New title for the database as rich text array.
      - `icon` (object): Icon object for the database (emoji or external/file URL).
      - `cover` (object): Cover image object for the database.
      - `parent` (object): Parent object to move the database.
      - `is_inline` (boolean): Whether the database is displayed inline on a page.
    - Returns: Information about the updated database.
    - Note: For updating schema/properties, use `notion_update_data_source` instead.

12. `notion_update_data_source`

    - Update data source properties and schema configuration.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to update.
    - Optional inputs:
      - `properties` (object): Updated property schema. For relation properties, use `data_source_id` (not `database_id`).
      - `title` (array): New title for the data source as rich text array.
    - Returns: Information about the updated data source.

13. `notion_create_data_source_item`

    - Create a new page in a Notion data source.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to add the page to.
      - `properties` (object): Properties of the new page. These should match the data source schema. For relation property values, provide an array of page IDs: `{"relation": [{"id": "page-id-1"}]}`.
    - Returns: Information about the newly created page.
    - Note: Use `notion_retrieve_database` first to get the `data_source_id` from a database.

14. `notion_search`

    - Search pages or data sources by title in Notion.
    - Optional inputs:
      - `query` (string): Text to search for in page or data source titles.
      - `filter` (object): Filter results by object type. Set `property: "object"` and `value: "page"` or `value: "data_source"`.
      - `sort` (object): Sort order of results.
      - `start_cursor` (string): Pagination start cursor.
      - `page_size` (number, default: 100, max: 100): Number of results to retrieve.
    - Returns: List of matching pages or data sources.
    - Note: Databases may contain multiple data sources, which are returned as separate results.

15. `notion_list_all_users`

    - List all users in the Notion workspace.
    - Note: This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.
    - Optional inputs:
      - start_cursor (string): Pagination start cursor for listing users.
      - page_size (number, max: 100): Number of users to retrieve.
    - Returns: A paginated list of all users in the workspace.

16. `notion_retrieve_user`

    - Retrieve a specific user by user_id in Notion.
    - Note: This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.
    - Required inputs:
      - user_id (string): The ID of the user to retrieve.
    - Returns: Detailed information about the specified user.

17. `notion_retrieve_bot_user`

    - Retrieve the bot user associated with the current token in Notion.
    - Returns: Information about the bot user, including details of the person who authorized the integration.

18. `notion_create_comment`

    - Create a comment in Notion.
    - Requires the integration to have 'insert comment' capabilities.
    - Either specify a `parent` object with a `page_id` or a `discussion_id`, but not both.
    - Required inputs:
      - `rich_text` (array): Array of rich text objects representing the comment content.
    - Optional inputs:
      - `parent` (object): Must include `page_id` if used.
      - `discussion_id` (string): An existing discussion thread ID.
    - Returns: Information about the created comment.

19. `notion_retrieve_comments`
    - Retrieve a list of unresolved comments from a Notion page or block.
    - Requires the integration to have 'read comment' capabilities.
    - Required inputs:
      - `block_id` (string): The ID of the block or page whose comments you want to retrieve.
    - Optional inputs:
      - `start_cursor` (string): Pagination start cursor.
      - `page_size` (number, max: 100): Number of comments to retrieve.
    - Returns: A paginated list of comments associated with the specified block or page.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
