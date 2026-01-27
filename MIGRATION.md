# Migration Guide: Notion API Version Upgrade (2022-06-28 → 2025-09-03)

This guide helps you migrate your existing workflows to the new Notion API version 2025-09-03, which introduces the **data source** paradigm. This is a **breaking change** that requires updates to your Claude Desktop configuration and tool usage patterns.

## What Changed?

### Overview

Notion's 2025-09-03 API version introduces a fundamental architectural change:

- **Databases** are now containers that hold one or more **data sources**
- **Data sources** are the actual collections of pages/items within a database
- All query, create, and update operations now target **data sources**, not databases
- Database operations are now limited to database-level metadata (title, icon, cover, parent)

This separation provides clearer semantics and better support for databases with multiple data sources.

### Impact on Your Workflows

**Before (2022-06-28):**
- You queried databases directly using `database_id`
- You created items in databases using `database_id`

**After (2025-09-03):**
- You query data sources using `data_source_id`
- You create items in data sources using `data_source_id`
- You must first retrieve the `data_source_id` from a database

---

## Quick Reference: Tool Renames

| Old Tool Name (2022-06-28) | New Tool Name (2025-09-03) | Change Type |
|---|---|---|
| `notion_query_database` | `notion_query_data_source` | Renamed, parameter changed |
| `notion_create_database_item` | `notion_create_data_source_item` | Renamed, parameter changed |
| `notion_retrieve_database` | `notion_retrieve_database` | **Same name**, but now returns `data_sources` array |
| `notion_update_database` | `notion_update_database` + `notion_update_data_source` | **Split into two tools** |
| N/A | `notion_retrieve_data_source` | **New tool** |
| `notion_search` (filter: "database") | `notion_search` (filter: "data_source") | Filter value changed |

---

## Step-by-Step Migration

### Step 1: Understanding Data Sources

Every Notion database now contains one or more **data sources**. A data source is a collection of pages with a specific schema (set of properties).

To work with pages in a database, you need:
1. The **database ID** (to get metadata and list data sources)
2. The **data source ID** (to query, create, or update items)

**How to get a data source ID:**

**Option A: From the Notion UI**
1. Open your database in Notion
2. Click "⋮⋮⋮" (three dots) → Settings
3. Click "Manage data sources"
4. Click "Copy data source ID" for the data source you want

**Option B: Via API (programmatically)**
```typescript
// Retrieve database metadata
const db = await tools.notion_retrieve_database({
  database_id: "your-database-id-here"
});

// Extract data source ID(s)
const dataSourceId = db.data_sources[0].id;  // First data source
// OR find by name:
const dataSourceId = db.data_sources.find(ds => ds.name === "Primary")?.id;
```

### Step 2: Update Your Query Operations

**Old Workflow (2022-06-28):**
```typescript
// Query a database directly
const results = await tools.notion_query_database({
  database_id: "abc123-database-id",
  filter: {
    property: "Status",
    select: { equals: "Active" }
  }
});
```

**New Workflow (2025-09-03):**
```typescript
// Step 1: Get the data source ID (do this once, then save it)
const db = await tools.notion_retrieve_database({
  database_id: "abc123-database-id"
});
const dataSourceId = db.data_sources[0].id;  // e.g., "ds-xyz789"

// Step 2: Query the data source
const results = await tools.notion_query_data_source({
  data_source_id: dataSourceId,  // Use data_source_id instead of database_id
  filter: {
    property: "Status",
    select: { equals: "Active" }
  }
});
```

**Optimization Tip:**
Cache the `data_source_id` after retrieving it once. You don't need to call `notion_retrieve_database` every time you query.

### Step 3: Update Your Create Operations

**Old Workflow (2022-06-28):**
```typescript
// Create a new item in a database
await tools.notion_create_database_item({
  database_id: "abc123-database-id",
  properties: {
    "Name": { title: [{ text: { content: "New Task" } }] },
    "Status": { select: { name: "To Do" } }
  }
});
```

**New Workflow (2025-09-03):**
```typescript
// Step 1: Get the data source ID (if you don't have it already)
const db = await tools.notion_retrieve_database({
  database_id: "abc123-database-id"
});
const dataSourceId = db.data_sources[0].id;

// Step 2: Create item in the data source
await tools.notion_create_data_source_item({
  data_source_id: dataSourceId,  // Use data_source_id instead of database_id
  properties: {
    "Name": { title: [{ text: { content: "New Task" } }] },
    "Status": { select: { name: "To Do" } }
  }
});
```

### Step 4: Update Your Update Operations

**Important:** Database updates are now split into two separate operations:

**4A. Updating Database Metadata (title, icon, cover, parent)**

```typescript
// Update database-level properties
await tools.notion_update_database({
  database_id: "abc123-database-id",
  title: [{ text: { content: "My Updated Database Title" } }],
  icon: { emoji: "📊" },
  cover: { external: { url: "https://example.com/cover.jpg" } }
});
```

**4B. Updating Data Source Schema (properties)**

**Old Workflow (2022-06-28):**
```typescript
// Update database properties (schema)
await tools.notion_update_database({
  database_id: "abc123-database-id",
  properties: {
    "Priority": { select: { options: [{ name: "High" }, { name: "Low" }] } }
  }
});
```

**New Workflow (2025-09-03):**
```typescript
// Step 1: Get the data source ID
const db = await tools.notion_retrieve_database({
  database_id: "abc123-database-id"
});
const dataSourceId = db.data_sources[0].id;

// Step 2: Update data source schema
await tools.notion_update_data_source({
  data_source_id: dataSourceId,  // Target the data source, not the database
  properties: {
    "Priority": { select: { options: [{ name: "High" }, { name: "Low" }] } }
  }
});
```

### Step 5: Update Your Search Operations

**Old Workflow (2022-06-28):**
```typescript
// Search for databases
const results = await tools.notion_search({
  query: "My Database",
  filter: { property: "object", value: "database" }
});
```

**New Workflow (2025-09-03):**
```typescript
// Search for data sources
const results = await tools.notion_search({
  query: "My Database",
  filter: { property: "object", value: "data_source" }  // Changed from "database"
});

// Note: Each database may have multiple data sources in search results
// Filter or inspect the results to find the data source you need
```

---

## Common Migration Scenarios

### Scenario 1: Simple Task Tracker (Single Data Source)

Most databases have a single data source. This is the simplest case.

```typescript
// One-time setup: Get and cache the data source ID
const db = await tools.notion_retrieve_database({
  database_id: "your-task-db-id"
});
const TASK_DATA_SOURCE_ID = db.data_sources[0].id;  // Save this!

// Daily usage: Query tasks
const tasks = await tools.notion_query_data_source({
  data_source_id: TASK_DATA_SOURCE_ID,
  filter: { property: "Status", select: { equals: "In Progress" } }
});

// Daily usage: Create new task
await tools.notion_create_data_source_item({
  data_source_id: TASK_DATA_SOURCE_ID,
  properties: {
    "Name": { title: [{ text: { content: "New Task" } }] }
  }
});
```

### Scenario 2: Multiple Databases (Multiple Data Sources)

If you work with multiple databases, retrieve and cache each data source ID.

```typescript
// Setup: Get all your data source IDs
const tasksDb = await tools.notion_retrieve_database({ database_id: "tasks-db-id" });
const projectsDb = await tools.notion_retrieve_database({ database_id: "projects-db-id" });

const TASKS_DS_ID = tasksDb.data_sources[0].id;
const PROJECTS_DS_ID = projectsDb.data_sources[0].id;

// Use them directly in your workflows
await tools.notion_query_data_source({ data_source_id: TASKS_DS_ID, ... });
await tools.notion_query_data_source({ data_source_id: PROJECTS_DS_ID, ... });
```

### Scenario 3: Dynamic Data Source Selection

If a database has multiple data sources, you may need to select the correct one dynamically.

```typescript
// Retrieve database with multiple data sources
const db = await tools.notion_retrieve_database({
  database_id: "multi-source-db-id"
});

// Find the specific data source you need
const dataSource = db.data_sources.find(ds => ds.name === "Active Items");
if (!dataSource) {
  throw new Error("Data source 'Active Items' not found");
}

// Query the selected data source
const results = await tools.notion_query_data_source({
  data_source_id: dataSource.id,
  filter: { ... }
});
```

---

## Relation Properties

**Important Change:** When creating or updating relation properties, you must now use `data_source_id` instead of `database_id`.

**Old Workflow (2022-06-28):**
```typescript
await tools.notion_create_database({
  parent: { page_id: "..." },
  properties: {
    "Related Items": {
      relation: { database_id: "target-database-id" }  // Old way
    }
  }
});
```

**New Workflow (2025-09-03):**
```typescript
// Step 1: Get the target data source ID
const targetDb = await tools.notion_retrieve_database({
  database_id: "target-database-id"
});
const targetDataSourceId = targetDb.data_sources[0].id;

// Step 2: Create database with relation property
await tools.notion_create_database({
  parent: { page_id: "..." },
  properties: {
    "Related Items": {
      relation: { data_source_id: targetDataSourceId }  // New way
    }
  }
});
```

**Note:** API responses still include both `database_id` and `data_source_id` for compatibility, but you must only send `data_source_id` in requests.

---

## Troubleshooting

### "I don't have a data source ID, only a database ID"

**Solution:** Call `notion_retrieve_database` to get the list of data sources:

```typescript
const db = await tools.notion_retrieve_database({ database_id: "your-db-id" });
console.log(db.data_sources);  // Array of data sources with { id, name }
```

Then use the `id` from the data source you want to target.

### "My queries are failing after upgrade"

**Cause:** You're likely still using `database_id` in tools that now require `data_source_id`.

**Solution:** 
1. Check the tool name: `notion_query_database` is now `notion_query_data_source`
2. Check the parameter: `database_id` is now `data_source_id`
3. Ensure you're passing a data source ID, not a database ID

### "What happened to notion_query_database?"

**Answer:** It was renamed to `notion_query_data_source` to reflect the new API paradigm. The functionality is the same, but it now operates on data sources instead of databases.

### "Can I still use database IDs anywhere?"

**Yes, but only for database-level operations:**
- `notion_retrieve_database` - Get database metadata and data source list
- `notion_update_database` - Update database title, icon, cover, parent, is_inline
- `notion_create_database` - Create a new database with an initial data source

For **querying, creating items, or updating schema**, you must use data source IDs.

### "How do I know if a database has multiple data sources?"

Call `notion_retrieve_database` and check the `data_sources` array:

```typescript
const db = await tools.notion_retrieve_database({ database_id: "your-db-id" });
console.log(`This database has ${db.data_sources.length} data source(s)`);
db.data_sources.forEach(ds => console.log(`- ${ds.name} (ID: ${ds.id})`));
```

Most databases have a single data source, but advanced setups may have multiple.

---

## Migration Checklist

Use this checklist to ensure a complete migration:

- [ ] Identify all uses of `notion_query_database` → Replace with `notion_query_data_source`
- [ ] Identify all uses of `notion_create_database_item` → Replace with `notion_create_data_source_item`
- [ ] Update all `database_id` parameters to `data_source_id` in query/create operations
- [ ] Add data source ID discovery step to workflows (or cache IDs)
- [ ] Split `notion_update_database` calls into:
  - [ ] `notion_update_database` for DB-level properties (title, icon, cover)
  - [ ] `notion_update_data_source` for schema properties
- [ ] Update search filters: `"database"` → `"data_source"`
- [ ] Update relation properties to use `data_source_id` instead of `database_id`
- [ ] Test all workflows end-to-end
- [ ] Update any cached IDs or configuration files

---

## Migration Time Estimate

For most users:
- **Simple workflows** (1-2 databases): **5-10 minutes**
- **Moderate workflows** (3-5 databases): **10-15 minutes**
- **Complex workflows** (many databases, automation): **20-30 minutes**

The majority of the time is spent discovering data source IDs and updating parameter names.

---

## Additional Resources

- [Notion API 2025-09-03 Documentation](https://developers.notion.com/reference/intro)
- [Data Sources Concept](https://developers.notion.com/docs/working-with-databases#data-sources)
- [README.md](./README.md) - Updated tool documentation
- [AGENTS.md](./AGENTS.md) - Coding standards for this project

---

## Need Help?

If you encounter issues not covered in this guide:
1. Check the tool schemas in `src/types/schemas.ts` for exact parameter names
2. Review the README.md for updated tool descriptions
3. Open an issue in the GitHub repository with details of your use case

This migration represents a significant architectural improvement in the Notion API, providing clearer semantics and better support for complex database structures. While it requires workflow updates, the result is more explicit and maintainable code.
