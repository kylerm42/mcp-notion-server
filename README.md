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
- `NOTION_PRESET` (optional): Predefined configuration preset. Valid values: `read-only`, `write-only`, `write-markdown`, `read-write-markdown`, `full`. See "Configuration Presets" section for details.
- `NOTION_ENABLED_TOOLS`: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_data_source"). When used with `NOTION_PRESET`, adds tools to the preset's base (union). When used without preset, only the listed tools will be available. If not specified, all tools are enabled. This takes precedence over the `--enabledTools` command-line argument.
- `NOTION_ENABLED_BLOCKS`: Comma-separated list of block types to enable in raw JSON tools (e.g. "toggle,column,column_list,bookmark,embed"). When used with `NOTION_PRESET`, overrides the preset's block configuration. When specified, only the listed block types will be available in tools like `notion_append_block_children`. If not specified, all block types are enabled. Use this with Markdown tools for optimal token efficiency. See the "Token Efficiency with Block Filtering" section for detailed configuration examples.
- `NOTION_MARKDOWN_CONVERSION`: Set to "true" to enable experimental Markdown conversion. This can significantly reduce token consumption when viewing content, but may cause issues when trying to edit page content.
- `LOG_LEVEL` (optional): Controls logging verbosity. Valid values: `debug`, `info`, `warn`, `error`, `silent`. Default is `info`. All logs are written to stderr to avoid interfering with the MCP protocol on stdout.

## Command Line Arguments

- `--enabledTools`: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_database"). When specified, only the listed tools will be available. If not specified, all tools are enabled. Note: The `NOTION_ENABLED_TOOLS` environment variable takes precedence over this flag.

Read-only tools example using environment variable (recommended for MCP configs):

```json
{
  "mcpServers": {
    "notion-ro": {
      "command": "npx",
      "args": ["-y", "@kylerm42/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true",
        "NOTION_ENABLED_TOOLS": "notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_query_data_source,notion_retrieve_database,notion_retrieve_data_source,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments"
      }
    }
  }
}
```

Read-only tools example using command-line argument (for direct execution):

```bash
node build/index.js --enabledTools=notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_query_data_source,notion_retrieve_database,notion_retrieve_data_source,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments
```

## Configuration Presets

For common use cases, use predefined presets instead of manually specifying tools and blocks. Presets provide sensible defaults with the flexibility to customize.

### Available Presets

#### `read-only`
All read/retrieve/query/search tools with no write operations.

**Use case:** Read-only assistants, content indexing, data analysis

**Configuration:**
```json
{
  "mcpServers": {
    "notion-readonly": {
      "command": "npx",
      "args": ["-y", "@kylerm42/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_PRESET": "read-only"
      }
    }
  }
}
```

#### `write-only`
All write tools (markdown + raw blocks) with no read operations.

**Use case:** Content creation bots, import scripts, automated updates

**Configuration:**
```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "write-only"
  }
}
```

#### `write-markdown`
Markdown write tools only (no read, no raw blocks).

**Use case:** Simple content writers, note-taking assistants

**Configuration:**
```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "write-markdown"
  }
}
```

#### `read-write-markdown` (Recommended)
All read tools + markdown write tools. Token-optimized configuration.

**Use case:** General-purpose assistants with efficient context usage

**Configuration:**
```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "read-write-markdown"
  }
}
```

#### `full`
All tools with no filtering (default behavior).

**Use case:** Development, testing, maximum flexibility

**Configuration:**
```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "full"
  }
}
```

### Extending Presets

Presets can be customized using environment variables:

#### Add Tools to Preset (Union)

Start with a preset and add specific tools:

```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "read-only",
    "NOTION_ENABLED_TOOLS": "notion_update_page"
  }
}
```

This gives you all read tools plus the ability to update pages.

#### Override Block Filter (Replacement)

Start with a preset and customize block filtering:

```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_PRESET": "read-write-markdown",
    "NOTION_ENABLED_BLOCKS": "toggle,column"
  }
}
```

This gives you read + markdown tools, plus raw block tools with filtered schemas (only toggle and column blocks).

### Preset Comparison

| Preset | Read Tools | Markdown Write | Raw Block Write | Token Efficiency |
|--------|-----------|----------------|-----------------|------------------|
| `read-only` | ✅ | ❌ | ❌ | High (no write schemas) |
| `write-only` | ❌ | ✅ | ✅ | Medium (all write schemas) |
| `write-markdown` | ❌ | ✅ | ❌ | High (markdown only) |
| `read-write-markdown` | ✅ | ✅ | ❌ | Highest (optimized) |
| `full` | ✅ | ✅ | ✅ | Standard (no filtering) |

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

## Markdown Tools for Content Creation

This server provides Markdown-based tools that dramatically simplify content creation by allowing you to use familiar Markdown syntax instead of complex JSON structures. These tools are ideal for approximately 95% of content creation use cases.

### Benefits of Markdown Tools

- **Simpler syntax**: Use standard Markdown instead of nested JSON block objects
- **Reduced context consumption**: Markdown tools consume significantly fewer tokens than raw JSON schemas
- **GitHub Flavored Markdown support**: Tables, task lists, code blocks with syntax highlighting, and more
- **Faster content creation**: Write naturally without worrying about Notion's block structure

### Available Markdown Tools

#### `notion_append_markdown`

Append Markdown content to an existing Notion block.

**Example:**

```json
{
  "name": "notion_append_markdown",
  "arguments": {
    "block_id": "abc123",
    "markdown": "## New Section\n\nSome **bold** and *italic* text.\n\n- Item 1\n- Item 2"
  }
}
```

**Supported Markdown features:**
- Headings (H1-H3)
- Paragraphs with inline formatting (bold, italic, strikethrough, code)
- Bulleted and numbered lists
- Code blocks with language highlighting
- Tables (GitHub Flavored Markdown)
- Block quotes
- Images (with valid URLs)
- Math equations (KaTeX syntax)

#### `notion_create_page_from_markdown`

Create a new Notion page with Markdown content.

**Example:**

```json
{
  "name": "notion_create_page_from_markdown",
  "arguments": {
    "parent": { "page_id": "parent-page-id" },
    "title": "Meeting Notes - Q1 Planning",
    "markdown": "# Agenda\n\n1. Review Q1 goals\n2. Discuss roadmap\n3. Resource allocation\n\n## Action Items\n\n- [ ] Update project spec\n- [ ] Schedule follow-up meeting\n\n## Code Review\n\n```javascript\nfunction calculateMetrics() {\n  return data.reduce((sum, item) => sum + item.value, 0);\n}\n```"
  }
}
```

**For database items:**

```json
{
  "name": "notion_create_page_from_markdown",
  "arguments": {
    "parent": { "database_id": "database-id" },
    "markdown": "# Project Overview\n\nThis project focuses on...",
    "properties": {
      "Name": { "title": [{ "text": { "content": "Project Alpha" } }] },
      "Status": { "select": { "name": "In Progress" } },
      "Priority": { "number": 1 }
    }
  }
}
```

### When to Use Markdown vs. Raw JSON Tools

**Use Markdown tools (`notion_append_markdown`, `notion_create_page_from_markdown`) for:**
- Paragraphs and headings
- Lists (bulleted, numbered, task lists)
- Tables
- Code blocks
- Simple formatted text (bold, italic, links)
- Most content creation scenarios (95% of use cases)

**Use raw JSON tools (`notion_append_block_children`, `notion_update_block`) for:**
- Toggle blocks (collapsible sections)
- Multi-column layouts
- Embedded content (bookmarks, videos, files)
- Synced blocks
- Advanced block configurations not expressible in Markdown (5% of use cases)

### Token Efficiency with Block Filtering

To maximize token efficiency, you can combine Markdown tools with the `NOTION_ENABLED_BLOCKS` environment variable to minimize tool schema size.

#### Optimized Configuration (Markdown-First)

This configuration uses Markdown tools for standard content and enables only essential complex blocks:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@kylerm42/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true",
        "NOTION_ENABLED_BLOCKS": "toggle,column,column_list,bookmark,embed",
        "NOTION_ENABLED_TOOLS": "notion_append_markdown,notion_create_page_from_markdown,notion_append_block_children,notion_retrieve_page,notion_retrieve_block_children,notion_query_data_source,notion_create_data_source_item,notion_search"
      }
    }
  }
}
```

**Token savings:** This configuration reduces tool schema context from approximately 22,000 tokens to 6,000 tokens (73% reduction) while maintaining full functionality through the hybrid approach.

#### Hybrid Configuration (Balanced)

Enable more block types while still using Markdown for most content:

```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token",
    "NOTION_ENABLED_BLOCKS": "toggle,column,column_list,bookmark,embed,divider,table_of_contents,synced_block"
  }
}
```

#### Full Configuration (No Filtering)

Omit `NOTION_ENABLED_BLOCKS` entirely to enable all block types in raw JSON tools:

```json
{
  "env": {
    "NOTION_API_TOKEN": "your-integration-token"
  }
}
```

This is the default behavior and maintains backward compatibility with existing configurations.

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

### Markdown Content Tools

1. `notion_append_markdown`

   - Append Markdown content to a Notion block. Ideal for adding formatted text, lists, tables, and code blocks without complex JSON syntax.
   - Required inputs:
     - `block_id` (string): The ID of the parent block to append content to.
     - `markdown` (string): Markdown content to append. Supports GitHub Flavored Markdown including headings, lists, tables, code blocks, equations, and inline formatting.
   - Optional inputs:
     - `format` (string): Response format ("json" or "markdown").
   - Returns: Information about the appended blocks.
   - Supported Markdown features: Headings (H1-H3), paragraphs, bold/italic/strikethrough, bulleted/numbered lists, code blocks with syntax highlighting, tables, block quotes, images, math equations (KaTeX).

2. `notion_create_page_from_markdown`

   - Create a new Notion page with Markdown content. Simplifies page creation by using familiar Markdown syntax.
   - Required inputs:
     - `parent` (object): Parent object (page_id, database_id, or workspace). Use page_id for sub-pages, database_id for database items.
     - `markdown` (string): Page content in Markdown format. Supports all GitHub Flavored Markdown features.
   - Optional inputs:
     - `title` (string): The page title (plain text).
     - `properties` (object): Database properties if parent is a database. For relation properties, provide an array of page IDs: `{"relation": [{"id": "page-id"}]}`.
     - `icon` (object): Page icon (emoji or external URL).
     - `format` (string): Response format ("json" or "markdown").
   - Returns: Information about the newly created page.
   - Note: For database items, use the `properties` parameter to set property values according to the database schema.

### Raw Block Tools

3. `notion_append_block_children`

   - Append child blocks to a parent block using raw JSON block objects. Use this for complex block types not supported by Markdown (toggles, columns, embeds).
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
     - `children` (array): Array of block objects to append. Each block must follow the Notion block schema.
   - Returns: Information about the appended blocks.
   - Note: When `NOTION_ENABLED_BLOCKS` is set, only the specified block types will be available in the schema. For standard content (paragraphs, headings, lists), use `notion_append_markdown` instead.

4. `notion_retrieve_block`

   - Retrieve information about a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to retrieve.
   - Returns: Detailed information about the block.

5. `notion_retrieve_block_children`

   - Retrieve the children of a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
   - Optional inputs:
     - `start_cursor` (string): Cursor for the next page of results.
     - `page_size` (number, default: 100, max: 100): Number of blocks to retrieve.
   - Returns: List of child blocks.

6. `notion_delete_block`

   - Delete a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to delete.
   - Returns: Confirmation of the deletion.

7. `notion_retrieve_page`

   - Retrieve information about a specific page.
   - Required inputs:
     - `page_id` (string): The ID of the page to retrieve.
   - Returns: Detailed information about the page.

8. `notion_update_page_properties`

   - Update properties of a page.
   - Required inputs:
     - `page_id` (string): The ID of the page to update.
     - `properties` (object): Properties to update.
   - Returns: Information about the updated page.

### Database and Data Source Tools

9. `notion_create_database`

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
