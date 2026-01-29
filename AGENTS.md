# Agent Guidelines for MCP Notion Server

This document contains coding standards, build commands, and guidelines for AI coding agents working on this MCP server for the Notion API.

## Project Overview

- **Language**: TypeScript (ES2022, Node16 module resolution)
- **Runtime**: Node.js
- **Package Manager**: npm
- **Test Framework**: Vitest
- **Build Tool**: TypeScript Compiler (tsc)
- **Module Type**: ESM (ES Modules)
- **API Target**: Notion API version 2025-09-03

## Build, Test, and Development Commands

### Build Commands
```bash
npm run build          # Compile TypeScript to build/ directory
npm run watch          # Watch mode for continuous compilation
npm run prepare        # Pre-publish build (runs automatically)
```

### Test Commands
```bash
npm test               # Run all tests once with Vitest
npm run test:watch     # Run tests in watch mode

# Run a single test file
npx vitest run src/client.test.ts

# Run tests matching a pattern
npx vitest run -t "should initialize"

# Run specific test file in watch mode
npx vitest src/markdown/index.test.ts
```

### Development Tools
```bash
npm run inspector      # Launch MCP Inspector for debugging
node build/index.js    # Run the compiled server directly
```

### Environment Variables
- `NOTION_API_TOKEN` (required): Notion API integration token
- `NOTION_PRESET` (optional): Predefined configuration preset. Valid values: `read-only`, `write-only`, `write-markdown`, `read-write-markdown`, `full`. If set, provides base tool and block configuration. Can be extended with `NOTION_ENABLED_TOOLS` (additive) and `NOTION_ENABLED_BLOCKS` (override). If not set, existing behavior is preserved (backward compatible).
- `NOTION_ENABLED_TOOLS`: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_data_source"). When used with `NOTION_PRESET`, adds tools to preset's base (union). When used without preset, only these tools will be enabled.
- `NOTION_ENABLED_BLOCKS`: Comma-separated list of block types to enable in raw JSON tools (e.g. "toggle,column,column_list"). When used with `NOTION_PRESET`, overrides preset's block configuration. Used for schema filtering to reduce token consumption. See "Block Schema Filtering Configuration" section below.
- `NOTION_MARKDOWN_CONVERSION`: Set to "true" to enable Markdown conversion
- `NODE_ENV`: Set to "test" to prevent server startup during testing
- `VITEST`: Set to "true" by Vitest during test runs

## Code Style Guidelines

### Import Conventions

1. **Always use `.js` extensions** in imports (TypeScript ESM requirement):
   ```typescript
   ✅ import { startServer } from "./server/index.js";
   ❌ import { startServer } from "./server/index";
   ```

2. **Import order** (by convention observed in codebase):
   - External dependencies first (SDK, libraries)
   - Internal modules second (types, utils, client)
   - Group by category with blank lines

   ```typescript
   // External dependencies
   import { Server } from "@modelcontextprotocol/sdk/server/index.js";
   import fetch from "node-fetch";
   
   // Internal modules
   import { NotionClientWrapper } from "../client/index.js";
   import { filterTools } from "../utils/index.js";
   import * as schemas from "../types/schemas.js";
   import * as args from "../types/args.js";
   ```

3. **Use namespace imports** for related type groups:
   ```typescript
   ✅ import * as args from "../types/args.js";
   ✅ import * as schemas from "../types/schemas.js";
   ```

### TypeScript and Type Conventions

1. **Strict mode enabled**: All strict TypeScript checks are enforced
2. **Explicit types** for function parameters and return types:
   ```typescript
   async function queryDatabase(
     database_id: string,
     filter?: Record<string, any>,
     page_size?: number
   ): Promise<ListResponse> { ... }
   ```

3. **Interface over type** for object shapes (seen in types/args.ts):
   ```typescript
   ✅ export interface RetrievePageArgs { ... }
   ❌ export type RetrievePageArgs = { ... }
   ```

4. **Use `Record<string, any>`** for flexible object properties:
   ```typescript
   properties: Record<string, any>
   ```

5. **Optional parameters** use `?:` syntax consistently:
   ```typescript
   start_cursor?: string
   page_size?: number
   ```

### Naming Conventions

1. **Variables and functions**: camelCase
   ```typescript
   const notionToken = process.env.NOTION_API_TOKEN;
   async function retrieveBlock(block_id: string) { ... }
   ```

2. **Classes**: PascalCase
   ```typescript
   export class NotionClientWrapper { ... }
   ```

3. **Interfaces**: PascalCase, no "I" prefix
   ```typescript
   export interface AppendBlockChildrenArgs { ... }
   ```

4. **Constants**: camelCase (not SCREAMING_SNAKE_CASE)
   ```typescript
   const enabledToolsSet = new Set(...);
   const baseUrl = "https://api.notion.com/v1";
   ```

5. **Private class members**: Use `private` keyword with camelCase
   ```typescript
   private notionToken: string;
   private headers: { [key: string]: string };
   ```

6. **Parameter names**: Use snake_case to match Notion API conventions
   ```typescript
   block_id: string      // Matches Notion API
   page_size?: number    // Matches Notion API
   start_cursor?: string // Matches Notion API
   ```

### File Organization

1. **File header comments**: Include purpose at top of each file
   ```typescript
   /**
    * Notion API client wrapper
    */
   ```

2. **Directory structure** (maintain existing organization):
   ```
   src/
   ├── index.ts              # Entry point
   ├── client/
   │   └── index.ts          # API client wrapper
   ├── server/
   │   └── index.ts          # MCP server setup
   ├── types/
   │   ├── index.ts          # Type exports
   │   ├── args.ts           # Tool argument interfaces
   │   ├── common.ts         # Common schemas
   │   ├── responses.ts      # API response types
   │   └── schemas.ts        # Tool schemas
   ├── utils/
   │   └── index.ts          # Utility functions
   └── markdown/
       ├── index.ts          # Markdown conversion
       └── index.test.ts     # Tests
   ```

3. **Test files**: Colocate tests with implementation (`*.test.ts`)

### Error Handling

1. **Explicit error messages** for missing required arguments:
   ```typescript
   if (!args.block_id) {
     throw new Error("Missing required argument: block_id");
   }
   ```

2. **Top-level error handling** in main():
   ```typescript
   main().catch((error) => {
     console.error("Fatal error in main():", error);
     process.exit(1);
   });
   ```

3. **Server error handling**: Log to stderr, wrap in try-catch
   ```typescript
   console.error("Received CallToolRequest:", request);
   try {
     // ... handle request
   } catch (error) {
     // Return error in response
   }
   ```

### API Client Patterns

1. **Use URLSearchParams** for query parameters:
   ```typescript
   const params = new URLSearchParams();
   if (start_cursor) params.append("start_cursor", start_cursor);
   ```

2. **Consistent fetch pattern**:
   ```typescript
   const response = await fetch(`${this.baseUrl}/endpoint`, {
     method: "GET" | "POST" | "PATCH" | "DELETE",
     headers: this.headers,
     body: JSON.stringify(body), // For POST/PATCH only
   });
   return response.json();
   ```

3. **Type API responses** with defined interfaces (see types/responses.ts)

### Testing Conventions

1. **Use Vitest's BDD syntax**: `describe`, `test`, `expect`, `beforeEach`
2. **Mock external dependencies** (node-fetch, markdown conversion):
   ```typescript
   vi.mock("node-fetch", () => ({ default: vi.fn() }));
   ```

3. **Test file structure**:
   ```typescript
   describe("ComponentName", () => {
     beforeEach(() => {
       // Setup
       vi.resetAllMocks();
     });
     
     test("should do something", () => {
       // Arrange, Act, Assert
     });
   });
   ```

4. **Use intentional @ts-ignore** sparingly, with explanatory comments:
   ```typescript
   // @ts-ignore - intentionally testing with null
   expect(convertToMarkdown(null)).toBe("");
   ```

## Notion API Version Update Guidelines

**Current version**: `2025-09-03`
**Previous version**: `2022-06-28`

### Breaking Changes (2022-06-28 → 2025-09-03)

The upgrade to API version 2025-09-03 introduced **breaking changes**:

1. **Data Source Paradigm Shift**
   - Databases now contain one or more **data sources**
   - Data sources are the actual collections of pages/items
   - All query/create/update operations target data sources, not databases

2. **Tool Renames**
   - `notion_query_database` → `notion_query_data_source`
   - `notion_create_database_item` → `notion_create_data_source_item`
   - Parameter change: `database_id` → `data_source_id` for these tools

3. **Split Update Operations**
   - `notion_update_database` - Now only for DB-level properties (title, icon, cover, parent, is_inline)
   - `notion_update_data_source` - New tool for schema/property updates

4. **New Tools Added**
   - `notion_retrieve_data_source` - Get data source schema and metadata
   - `notion_update_data_source` - Update data source properties

5. **Search Filter Change**
   - Search filter value: `"database"` → `"data_source"`

6. **Relation Properties**
   - Must use `data_source_id` instead of `database_id` in relation property definitions
   - Applies to `notion_create_database` and `notion_update_data_source`

7. **No Backward Compatibility**
   - Old tool names are not supported
   - No automatic database ID → data source ID resolution
   - Users must explicitly provide data source IDs

### Data Source Usage Patterns

**Standard Practice: Always use `data_source_id` for query/create/update operations**

```typescript
// ✅ Correct: Get data source ID first, then query
const db = await client.retrieveDatabase(database_id);
const dataSourceId = db.data_sources[0].id;
await client.queryDataSource(dataSourceId, filter);

// ❌ Incorrect: Cannot query database directly
await client.queryDatabase(database_id, filter);  // This method no longer exists
```

**Database-Level vs. Data Source-Level Operations**

Use `database_id` only for:
- Retrieving database metadata: `retrieveDatabase(database_id)`
- Updating DB-level properties: `updateDatabase(database_id, title?, icon?, cover?, parent?, is_inline?)`
- Creating new databases: `createDatabase(parent, properties, ...)`

Use `data_source_id` for:
- Querying pages: `queryDataSource(data_source_id, filter?, sorts?)`
- Creating pages: `createDataSourceItem(data_source_id, properties)`
- Updating schema: `updateDataSource(data_source_id, properties?, title?)`
- Retrieving schema: `retrieveDataSource(data_source_id)`

**Discovering Data Source IDs**

```typescript
// Pattern 1: Single data source (most common)
const db = await client.retrieveDatabase(database_id);
const dataSourceId = db.data_sources[0].id;

// Pattern 2: Multiple data sources (find by name)
const db = await client.retrieveDatabase(database_id);
const dataSource = db.data_sources.find(ds => ds.name === "Primary");
if (!dataSource) throw new Error("Data source not found");
const dataSourceId = dataSource.id;
```

### When Updating API Version in the Future

1. Update `Notion-Version` header in `src/client/index.ts`
2. Review [Notion API changelog](https://developers.notion.com/page/changelog) for breaking changes
3. Update type definitions in `src/types/responses.ts` for changed schemas
4. Update tool schemas in `src/types/schemas.ts` if parameters changed
5. Update method signatures in `src/client/index.ts` to match new API
6. Update server handlers in `src/server/index.ts` for renamed/new tools
7. Run full test suite: `npm test`
8. Update tests in `src/client.test.ts` for new expectations
9. Test with MCP Inspector: `npm run inspector`
10. Update README.md with new tool descriptions and examples
11. Create or update MIGRATION.md if breaking changes introduced
12. Update this file (AGENTS.md) with new patterns and breaking changes

## Configuration Presets

The preset system provides predefined configurations for common use cases. This section documents preset behavior and composition rules.

### Preset Definitions

Five standard presets are available in `src/presets.ts`:

```typescript
{
  "read-only": {
    tools: [retrieve_page, retrieve_block, query_data_source, search, ...],
    blocks: [] // No filtering
  },
  "write-only": {
    tools: [append_markdown, append_block_children, update_page, ...],
    blocks: [] // No filtering
  },
  "write-markdown": {
    tools: [append_markdown, create_page_from_markdown],
    blocks: [] // No raw block tools enabled
  },
  "read-write-markdown": {
    tools: [...read tools, append_markdown, create_page_from_markdown],
    blocks: [] // Token-optimized
  },
  "full": {
    tools: [], // Empty = all tools
    blocks: [] // Empty = no filtering
  }
}
```

### Composition Rules

**Rule 1: Tools are additive (union)**

When both `NOTION_PRESET` and `NOTION_ENABLED_TOOLS` are set, tools are combined:

```bash
export NOTION_PRESET=read-only
export NOTION_ENABLED_TOOLS=notion_update_page
# Result: All read tools + notion_update_page
```

This allows "read-only + one write tool" configurations without creating new presets.

**Rule 2: Blocks are override (replacement)**

When both `NOTION_PRESET` and `NOTION_ENABLED_BLOCKS` are set, blocks setting completely replaces preset's blocks:

```bash
export NOTION_PRESET=read-write-markdown  # blocks=[]
export NOTION_ENABLED_BLOCKS=toggle
# Result: Override empty blocks with [toggle]
```

This preserves token optimization intent. If blocks were additive, adding to an empty set would be confusing.

### Testing Presets

When testing preset functionality:

1. **Test pure presets** - Each preset in isolation
   ```typescript
   test("should resolve read-only preset", () => {
     const config = resolvePreset("read-only", undefined, undefined);
     expect(config.enabledTools).toContain("notion_retrieve_page");
   });
   ```

2. **Test tool composition** - Preset + ENABLED_TOOLS
   ```typescript
   test("should add tools to preset", () => {
     const config = resolvePreset("read-only", "notion_update_page", undefined);
     expect(config.enabledTools).toContain("notion_update_page");
   });
   ```

3. **Test block override** - Preset + ENABLED_BLOCKS
   ```typescript
   test("should override blocks", () => {
     const config = resolvePreset("read-write-markdown", undefined, "toggle");
     expect(config.enabledBlocks).toContain("toggle");
   });
   ```

4. **Test invalid presets** - Error handling
   ```typescript
   test("should throw on invalid preset", () => {
     expect(() => resolvePreset("invalid", undefined, undefined)).toThrow();
   });
   ```

5. **Test backward compatibility** - No preset set
   ```typescript
   test("should handle no preset", () => {
     const config = resolvePreset(undefined, "notion_retrieve_page", undefined);
     // Should behave like existing implementation
   });
   ```

### Common Preset Use Cases

**Read-only assistant:**
```bash
export NOTION_PRESET=read-only
```

**Content writer with toggle support:**
```bash
export NOTION_PRESET=read-write-markdown
export NOTION_ENABLED_TOOLS=notion_append_block_children  # Add raw block tool
export NOTION_ENABLED_BLOCKS=toggle  # Filter to only toggle
```

**Development/testing:**
```bash
export NOTION_PRESET=full
```

**Custom read-write with specific tools:**
```bash
export NOTION_PRESET=read-only
export NOTION_ENABLED_TOOLS=notion_update_page,notion_append_markdown
```

## Block Schema Filtering Configuration

### Overview

The `NOTION_ENABLED_BLOCKS` environment variable allows filtering of block types in raw JSON tools to reduce tool schema token consumption. This is designed to work in conjunction with Markdown tools for optimal efficiency.

### Configuration Strategy

**Markdown-First Approach (Recommended)**

Enable only complex block types that cannot be expressed in Markdown:

```bash
export NOTION_ENABLED_BLOCKS="toggle,column,column_list,bookmark,embed"
```

This configuration:
- Reduces tool schema context from ~22,000 tokens to ~6,000 tokens (73% reduction)
- Uses Markdown tools (`notion_append_markdown`, `notion_create_page_from_markdown`) for standard content
- Uses raw JSON tools (`notion_append_block_children`) only for complex layouts

**Balanced Approach**

Enable additional block types for more flexibility:

```bash
export NOTION_ENABLED_BLOCKS="toggle,column,column_list,bookmark,embed,divider,table_of_contents,synced_block"
```

**No Filtering (Default)**

Omit the variable entirely or set to empty string:

```bash
# NOTION_ENABLED_BLOCKS not set
```

This maintains backward compatibility and enables all block types in raw JSON tools.

### Block Type Categories

**Markdown-Supported Blocks (exclude from NOTION_ENABLED_BLOCKS):**
- `paragraph`, `heading_1`, `heading_2`, `heading_3`
- `bulleted_list_item`, `numbered_list_item`
- `code`, `quote`, `table`
- These are handled efficiently by `notion_append_markdown`

**Complex Blocks (include in NOTION_ENABLED_BLOCKS when needed):**
- `toggle` - Collapsible sections
- `column`, `column_list` - Multi-column layouts
- `bookmark`, `embed` - External content
- `synced_block` - Synced content blocks
- `divider`, `table_of_contents` - Special elements

### Testing Markdown Features

When testing Markdown conversion tools:

1. **Test Markdown-to-Block Conversion**
   ```typescript
   import { markdownToBlocks } from "@tryfabric/martian";
   
   test("should convert heading to heading_1 block", () => {
     const blocks = markdownToBlocks("# Title");
     expect(blocks[0].type).toBe("heading_1");
   });
   ```

2. **Test Tool Handlers**
   - Mock the `markdownToBlocks()` function to avoid external dependencies
   - Verify that handlers pass correct parameters to client methods
   - Test error handling for invalid Markdown

3. **Test Block Filtering**
   ```typescript
   import { getFilteredBlockSchema } from "./types/common.js";
   
   test("should filter to only specified blocks", () => {
     const filtered = getFilteredBlockSchema(new Set(["toggle"]));
     expect(filtered.properties).toHaveProperty("toggle");
     expect(filtered.properties).not.toHaveProperty("paragraph");
   });
   ```

4. **Test Edge Cases**
   - Empty Markdown strings
   - Malformed Markdown (invalid tables, etc.)
   - Very long content (test truncation behavior)
   - Invalid image URLs (verify fallback to text)

### Implementation Notes

- The `getFilteredBlockSchema()` function in `src/types/common.ts` handles dynamic schema filtering
- Empty `enabledBlocks` set returns full schema (no filtering)
- Tool descriptions dynamically update to reflect enabled block types
- Martian library (`@tryfabric/martian`) handles Markdown-to-Notion conversion
- Error handling in tool handlers wraps `markdownToBlocks()` calls

## Common Pitfalls to Avoid

- ❌ Forgetting `.js` extensions in imports
- ❌ Using CJS `require()` instead of ESM `import`
- ❌ Skipping type annotations on public APIs
- ❌ Not mocking fetch in tests (causes real API calls)
- ❌ Using inconsistent parameter naming (snake_case for API params)
- ❌ Forgetting to check `NODE_ENV` before starting server in tests
- ❌ Including Markdown-supported blocks in `NOTION_ENABLED_BLOCKS` (defeats the purpose of token optimization)
