---
id: 2026-01-27-api-version-upgrade-plan-2022
status: implemented
created: 2026-01-27
last_updated: 2026-01-27
owner: ap-5-orchestrator
---

# API Version Upgrade Plan: 2022-06-28 → 2025-09-03 (Breaking Changes)

## Overview

This specification outlines the migration of the MCP Notion Server from API version 2022-06-28 to 2025-09-03 without maintaining backwards compatibility. This approach embraces the new data source paradigm fully, resulting in cleaner code and more explicit user control.

### Key Changes
- **Data sources are first-class entities**: All tools operate directly on `data_source_id`
- **Tool renames**: Database tools become data source tools (e.g., `notion_query_database` → `notion_query_data_source`)
- **No automatic discovery**: Users must explicitly provide data source IDs
- **Database tools remain**: For database-level operations (metadata, listing data sources)
- **Breaking compatibility**: Users must update their Claude Desktop workflows

### Success Criteria
- ✅ All MCP tools upgraded to API version 2025-09-03
- ✅ Clean separation: database tools vs. data source tools
- ✅ Full test coverage with updated expectations
- ✅ Clear migration guide for existing users
- ✅ No hidden complexity or automatic ID resolution

---

## Architecture Changes

### 1. Core Client Architecture

**Current State:**
- Single `NotionClientWrapper` class with database-centric methods
- API version hardcoded as `2022-06-28` in headers
- Methods like `queryDatabase()`, `retrieveDatabase()`, `updateDatabase()`

**Target State:**
- Updated `NotionClientWrapper` with:
  - API version header: `2025-09-03`
  - Data source methods: `queryDataSource()`, `retrieveDataSource()`, `updateDataSource()`
  - Database methods: `retrieveDatabase()`, `updateDatabase()` (for DB-level operations only)
  - `createDatabase()` updated for new body structure
  - **No discovery helpers**: Users provide data source IDs explicitly

**Design Decision:**
Complete paradigm shift. The API now accurately reflects Notion's data model: databases contain data sources, operations target data sources. Users must understand this to use the tools effectively.

### 2. Tool Reorganization

**Database-Level Tools** (operate on databases):
- `notion_retrieve_database` - Get database metadata + list of data sources
- `notion_create_database` - Create database with initial data source
- `notion_update_database` - Update DB-level properties (title, icon, cover, parent, is_inline)

**Data Source Tools** (operate on data sources):
- `notion_query_data_source` - Query a data source (renamed from query_database)
- `notion_retrieve_data_source` - Get data source schema (NEW)
- `notion_update_data_source` - Update data source properties (schema) (NEW)
- `notion_create_data_source_item` - Create page in data source (renamed from create_database_item)

**Removed Tools:**
- ~~`notion_update_database`~~ (split into update_database and update_data_source)

**Rationale**: Clear separation of concerns. Database operations are distinct from data source operations. Users understand what they're manipulating.

### 3. Endpoint Migration Map

| Old Tool | New Tool/Endpoint | Change Type |
|---|---|---|
| `notion_query_database` | `notion_query_data_source` → `POST /v1/data_sources/{ds_id}/query` | **Renamed + Path change** |
| `notion_retrieve_database` | `notion_retrieve_database` → `GET /v1/databases/{db_id}` | **Behavior change**: Returns data sources list |
| N/A | `notion_retrieve_data_source` → `GET /v1/data_sources/{ds_id}` | **NEW** |
| `notion_update_database` | Split: `notion_update_database` → `PATCH /v1/databases/{db_id}` (DB-level) + `notion_update_data_source` → `PATCH /v1/data_sources/{ds_id}` (schema) | **Split into two tools** |
| `notion_create_database` | `notion_create_database` → `POST /v1/databases` | **Body structure change** |
| `notion_create_database_item` | `notion_create_data_source_item` → `POST /v1/pages` | **Renamed + Parent type change** |
| `notion_search` (database filter) | `notion_search` (data_source filter) | **Filter value change** |

---

## Implementation Tasks

### Phase 1: Core Client Infrastructure

**Task 1.1: Update API Version Header**
- Change `Notion-Version` header from `"2022-06-28"` to `"2025-09-03"` in `NotionClientWrapper` constructor
- **Location**: `src/client/index.ts` line 29
- **Simple change**: One line

**Task 1.2: Rename Query Method**
- Rename `queryDatabase()` to `queryDataSource()`
- Change parameter: `database_id: string` → `data_source_id: string`
- Update endpoint: `/databases/{db_id}/query` → `/data_sources/{ds_id}/query`
- Update return type handling if needed
- **No discovery logic**: Direct API call

**Task 1.3: Update Retrieve Database**
- Keep `retrieveDatabase(database_id)` method
- Update response type to include `data_sources[]` field
- **Purpose**: Returns database metadata + list of available data sources
- Users call this first to discover data source IDs

**Task 1.4: Add Retrieve Data Source Method**
- Create new `retrieveDataSource(data_source_id: string)` method
- Endpoint: `GET /v1/data_sources/{data_source_id}`
- Returns data source schema (properties)
- **Purpose**: Get detailed schema information for a specific data source

**Task 1.5: Split Update Methods**
- Keep `updateDatabase()` for DB-level updates (title, icon, cover, parent, is_inline)
- Create new `updateDataSource()` for schema updates (properties, title, in_trash)
- Remove property handling from `updateDatabase()`
- **Parameters**:
  - `updateDatabase(database_id, title?, icon?, cover?, parent?, is_inline?)`
  - `updateDataSource(data_source_id, properties?, title?)`

**Task 1.6: Update Create Database**
- Restructure request body: move `properties` to `initial_data_source.properties`
- Keep top-level: `parent`, `title`, `icon`, `cover`
- **No signature change needed**: Internal restructuring only

**Task 1.7: Rename Create Database Item**
- Rename `createDatabaseItem()` to `createDataSourceItem()`
- Change parameter: `database_id: string` → `data_source_id: string`
- Change parent from `{type: "database_id", database_id}` to `{type: "data_source_id", data_source_id}`

### Phase 2: Type System Updates

**Task 2.1: Add Data Source Response Types** ✅
- Create `DataSourceResponse` interface in `src/types/responses.ts`
- Add `data_sources: Array<{id: string, name: string}>` to `DatabaseResponse`
- Add `database_parent` field to `DataSourceResponse`
- Update `parent` field types to support `data_source_id`

**Task 2.2: Rename Argument Interfaces** ✅
- Rename `QueryDatabaseArgs` → `QueryDataSourceArgs`
- Rename `CreateDatabaseItemArgs` → `CreateDataSourceItemArgs`
- Add `RetrieveDataSourceArgs` interface
- Add `UpdateDataSourceArgs` interface
- Update parameter names: `database_id` → `data_source_id` where appropriate
- Update `CreateDatabaseArgs` structure (add `initial_data_source` wrapper)

**Task 2.3: Update Tool Schemas** ✅
- Rename tool schemas:
  - `queryDatabaseTool` → `queryDataSourceTool`
  - `createDatabaseItemTool` → `createDataSourceItemTool`
- Add new tool schemas:
  - `retrieveDataSourceTool`
  - `updateDataSourceTool`
- Split `updateDatabaseTool`: keep for DB-level, create new for data source
- Update all tool descriptions to reflect data source paradigm
- Update parameter names and descriptions

### Phase 3: Server Request Handling

**Task 3.1: Update Tool Name Handlers**
- Rename case handlers in `src/server/index.ts`:
  - `"notion_query_database"` → `"notion_query_data_source"`
  - `"notion_create_database_item"` → `"notion_create_data_source_item"`
- Add new case handlers:
  - `"notion_retrieve_data_source"`
  - `"notion_update_data_source"`
- Update `notion_update_database` handler to only handle DB-level properties
- **Validation**: Check parameter names match new signatures

**Task 3.2: Update Tool Registration**
- Update `ListToolsRequestSchema` handler tool list:
  - Remove old tool names
  - Add new tool names
- Ensure exported schemas match case handler names

### Phase 4: Search API Migration

**Task 4.1: Update Search Method** ✅
- Update `search()` filter type: accept `"data_source"` instead of `"database"`
- Update return type to handle data source objects
- **No logic changes**: Direct API call, just different filter value

**Task 4.2: Update Search Tool Schema** ✅
- Update `searchTool` description: mention data sources instead of databases
- Update filter value options: `"page"` or `"data_source"`
- Add note about multiple data sources per database in search results

### Phase 5: Relation Properties

**Task 5.1: Update Relation Property Handling** ✅
- [x] Review all methods that handle relation properties
- [x] Ensure relation objects use `data_source_id` exclusively
- [x] Remove any `database_id` usage in request bodies
- [x] Update type definitions for relation property objects
- [x] **Note**: API responses still include both IDs, but requests must only send `data_source_id`

### Phase 6: Testing

**Task 6.1: Update Unit Tests** ✅
- [x] Update `src/client.test.ts`:
  - [x] Change header assertion to `"2025-09-03"`
  - [x] Rename test cases to match new method names
  - [x] Update parameter names (database_id → data_source_id)
  - [x] Update endpoint paths in expectations
  - [x] Mock `data_sources[]` in database responses
- **Coverage goal**: All renamed/new methods tested

**Task 6.2: Add Data Source Tests** ✅
- [x] Test `retrieveDataSource()` method
- [x] Test `updateDataSource()` method
- [x] Test `createDataSourceItem()` method
- [x] Test database response includes `data_sources[]`
- [x] Test split update behavior (DB vs. schema)

**Task 6.3: Integration Testing**
- Test tool execution via MCP Inspector:
  - [ ] Query data source by ID
  - [ ] Retrieve database to get data source list
  - [ ] Retrieve specific data source schema
  - [ ] Create database with initial data source
  - [ ] Create item in data source
  - [ ] Update database properties
  - [ ] Update data source schema
  - [ ] Search for data sources

### Phase 7: Documentation

**Task 7.1: Create Migration Guide** ✅
- [x] Create `MIGRATION.md` with breaking changes documentation:
  - [x] List all renamed tools with before/after examples
  - [x] Explain new workflow: retrieve database → get data source ID → query data source
  - [x] Provide code examples for common operations
  - [x] Document new data source concept
- **Goal**: Users can migrate their workflows in 15 minutes

**Task 7.2: Update README** ✅
- [x] Update tools list with new names and descriptions
- [x] Add "Data Sources" concept section
- [x] Add workflow examples showing data source discovery
- [x] Update all tool examples to use new signatures
- [x] Add troubleshooting section for migration issues

**Task 7.3: Update AGENTS.md** ✅
- [x] Update "Notion API Version Update Guidelines" section
- [x] Document the breaking changes made in this upgrade
- [x] Remove backward compatibility guidance (no longer applicable)
- [x] Add data source patterns as standard practice

---

## Code Simplification Analysis

### What We REMOVE by dropping backwards compatibility:

**1. No Data Source Discovery Helper** (~50 lines removed)
```typescript
// DELETED: No automatic resolution
async _resolveDataSourceId(database_id: string): Promise<string> {
  const db = await this.retrieveDatabase(database_id);
  if (!db.data_sources?.length) throw new Error(...);
  return db.data_sources[0].id;
}
```

**2. No Dual-Purpose Methods** (~30 lines simpler)
```typescript
// BEFORE (complex): Handles both DB and data source updates
async updateDatabase(database_id, title?, properties?, ...) {
  if (properties) {
    const ds_id = await this._resolveDataSourceId(database_id);
    // Update data source...
  } else {
    // Update database...
  }
}

// AFTER (simple): Two focused methods
async updateDatabase(database_id, title?, icon?, ...) {
  // Just update database
}
async updateDataSource(data_source_id, properties?, ...) {
  // Just update data source
}
```

**3. No Hidden Complexity** (~20 lines removed)
```typescript
// DELETED: No automatic discovery in query
async queryDatabase(database_id, filter?, ...) {
  const ds_id = await this._resolveDataSourceId(database_id); // Extra API call
  return fetch(`/data_sources/${ds_id}/query`, ...);
}

// SIMPLER: Direct operation
async queryDataSource(data_source_id, filter?, ...) {
  return fetch(`/data_sources/${data_source_id}/query`, ...);
}
```

**Total Code Reduction**: ~100-150 lines removed, 20-30% less complexity in client class

---

## User Workflow Changes

### Old Workflow (2022-06-28):
```typescript
// Query database
await tools.notion_query_database({
  database_id: "abc123",
  filter: {...}
});

// Create item
await tools.notion_create_database_item({
  database_id: "abc123",
  properties: {...}
});
```

### New Workflow (2025-09-03):

**Scenario A: User Already Has Data Source ID**
```typescript
// Direct operation - no discovery needed
await tools.notion_query_data_source({
  data_source_id: "ds-xyz789",  // User provides this directly
  filter: {...}
});

await tools.notion_create_data_source_item({
  data_source_id: "ds-xyz789",
  properties: {...}
});
```

**Scenario B: User Only Has Database ID**
```typescript
// Step 1: Get database info to find data sources
const db = await tools.notion_retrieve_database({
  database_id: "abc123"
});

// Step 2: Extract data source ID (first one, or choose by name)
const dataSourceId = db.data_sources[0].id;
// For multi-source: db.data_sources.find(ds => ds.name === "Primary")?.id

// Step 3: Use data source ID in operations
await tools.notion_query_data_source({
  data_source_id: dataSourceId,
  filter: {...}
});
```

**Why This Is Necessary**:
The tool parameters are what users (or Claude) must provide when calling the tool. Notion's 2025-09-03 API requires operations to target specific data sources, not databases. We have three options:

1. **Tools accept database_id, auto-discover data source** (backwards compatible, complex)
2. **Tools accept data_source_id directly** (breaking change, simple) ← **This plan**
3. **Tools accept both, with discovery fallback** (complex, confusing)

We chose option 2 for code simplicity and explicit behavior.

**User Impact**: 
- **If users have data source IDs**: No extra steps, direct operation
- **If users only have database IDs**: One extra discovery step to get the data source ID
- **How to get data source IDs**: 
  - Via API: Call `notion_retrieve_database` which returns `data_sources[]` array
  - Via Notion UI: Settings → Manage data sources → "Copy data source ID" button (per Notion docs)
  - **Users will typically do this once and save the ID for reuse**
- **Clarity**: Tools explicitly state they operate on data sources, not databases

---

## Testing Strategy

### Unit Testing
- **Scope**: All renamed/new methods
- **Changes**: Update method names, parameters, endpoints in test expectations
- **New Tests**: `retrieveDataSource()`, `updateDataSource()`, split update behavior
- **Simpler**: No discovery logic to test

### Integration Testing
- **MCP Inspector**: Test renamed tools with explicit data source IDs
- **Test Database**: Create test database, extract data source ID, perform operations
- **Workflow**: End-to-end test of discover → query → create item

### Manual Testing Checklist
- [ ] Retrieve database returns data sources list
- [ ] Query data source with explicit ID works
- [ ] Create database with initial data source succeeds
- [ ] Create item in data source works
- [ ] Update database (DB-level properties) works
- [ ] Update data source (schema) works
- [ ] Search returns data sources
- [ ] Error messages guide users correctly

---

## Migration Risks & Mitigation

### Risk 1: User Confusion
**Impact**: High (users must change workflows)
**Probability**: High
**Mitigation**:
- Comprehensive migration guide with examples
- Clear error messages that guide users to new workflow
- Document data source concept thoroughly
- Provide before/after code examples

### Risk 2: Tool Discovery Friction
**Impact**: Medium
**Probability**: High
**Mitigation**:
- Document the retrieve database → extract data source ID pattern prominently
- Provide helper examples in README
- Consider future enhancement: caching or shortcuts

### Risk 3: Accidentally Removed Functionality
**Impact**: Medium
**Probability**: Low
**Mitigation**:
- Careful code review of all method renames
- Ensure all old functionality has a new equivalent
- Integration testing covers all common operations

---

## Rollback Plan

### If Migration Fails
1. **Revert commits**: Git revert to previous API version
2. **Republish**: Previous version to npm (if published)
3. **Communication**: Notify users of rollback

### Rollback Triggers
- Critical bugs in production
- Unforeseen API incompatibilities
- User adoption issues too severe

**Note**: Rollback is simpler because there's no compatibility layer to untangle.

---

## Acceptance Criteria

### Functional Requirements
- ✅ All tools operate correctly with API version 2025-09-03
- ✅ Data source tools accept explicit data source IDs
- ✅ Database tools return data source information
- ✅ Database creation with initial data source works
- ✅ Data source item creation works
- ✅ Split update (DB vs. data source) works correctly
- ✅ Search returns data sources

### Non-Functional Requirements
- ✅ All unit tests pass
- ✅ Test coverage maintained
- ✅ Code is simpler and clearer than before
- ✅ Migration guide is complete and accurate
- ✅ No hidden discovery logic or automatic ID resolution

### Quality Requirements
- ✅ TypeScript compilation succeeds
- ✅ No console errors
- ✅ Error messages are clear and actionable
- ✅ Code follows project style guidelines

---

## Timeline Estimate

- **Phase 1**: Core Infrastructure (3-4 hours) - *Simpler: no discovery logic*
- **Phase 2**: Type System (3-4 hours) - *Mostly renames*
- **Phase 3**: Server Handlers (2-3 hours) - *Update case statements*
- **Phase 4**: Search API (1-2 hours) - *Simple changes*
- **Phase 5**: Relation Properties (2-3 hours) - *Same as before*
- **Phase 6**: Testing (4-5 hours) - *Simpler: no discovery to test*
- **Phase 7**: Documentation (4-5 hours) - *Migration guide is critical*

**Total Estimate**: 19-26 hours of implementation work

**30-40% faster** than backwards-compatible approach due to eliminated complexity.

---

# Plan Feedback

I've reviewed this plan and have 1 piece of feedback:

## 1. Feedback on: "New Workflow (2025-09-03):"
> Please explain more about why this is necessary. Would/could the tool not just accept a dataSourceId instead of a database_id?

---
