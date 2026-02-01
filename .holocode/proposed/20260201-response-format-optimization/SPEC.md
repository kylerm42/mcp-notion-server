# Feature Spec: Response Format Optimization for Large Datasets
---
id: 20260201-response-format-optimization
status: implemented
created: 2026-02-01
last_updated: 2026-02-01T17:30:00Z
owner: AP-5
---

## 1. Overview

**Purpose:**
Provide token-efficient response formats for Notion data source queries to overcome MCP protocol's 25KB response truncation limit while supporting multiple agent usage patterns.

**User Story:**
As an AI agent querying Notion databases with hundreds of results, I need lightweight response formats so that I can scan large datasets, compare data sources, and selectively retrieve full details without hitting response size limits.

**Problem Statement:**
Current implementation returns full page objects with all properties for every result. A query returning 964 database items produces 322KB of JSON, which gets truncated at 25KB by the MCP protocol. This breaks workflows requiring:
1. Complete dataset visibility for comparison/validation
2. Efficient scanning to identify items of interest
3. Data aggregation and analysis across large collections

## 2. Requirements & Acceptance Criteria

Functional requirements as measurable outcomes:

- [ ] **FR-1: Summary Format** - `notion_query_data_source` accepts `response_format: "summary"` parameter that returns lightweight page representations (ID, title, URL, and top-level metadata only) allowing 200+ results within 25KB limit
- [ ] **FR-2: Table Format** - `notion_query_data_source` accepts `response_format: "table"` parameter that returns Markdown table with configurable columns, showing 50+ results within 25KB limit
- [ ] **FR-3: Column Selection** - `response_format: "table"` accepts optional `columns: string[]` parameter to specify which properties appear as table columns; if omitted, all properties included
- [ ] **FR-4: Backward Compatibility** - Existing `format: "json"` behavior unchanged; agents opting into new formats explicitly
- [ ] **FR-5: Pagination Awareness** - All formats include clear pagination guidance with `has_more` flag and `next_cursor` value when applicable
- [ ] **FR-6: Drill-Down Pattern** - Table and summary formats include instructions for using `notion_retrieve_page` to get full details for specific items
- [ ] **FR-7: Schema-Level Metadata** - Summary format includes data source schema (property names and types) at top level, not repeated per-item

**Non-Functional Requirements:**
- Performance: Format conversion must add <100ms to response time
- Maintainability: Property extraction logic must be reusable across formats
- Extensibility: Architecture must support future format additions (CSV, compact-JSON, etc.)

## 3. Architecture & Design

### High-Level Approach

Introduce a **format transformation layer** between the Notion API client and the MCP response handler. This layer intercepts full API responses and applies format-specific transformations before returning to the agent.

```
[Notion API] → [Client Wrapper] → [Format Transformer] → [MCP Response] → [Agent]
                                         ↓
                               [summary | table | json]
```

### Component Interactions

**1. Server Handler Enhancement (`src/server/index.ts`)**
- Extract `response_format` and `columns` from request arguments
- Pass format preferences to new response transformer
- Return transformed response instead of raw JSON

**2. New Format Transformer Module (`src/formats/transformer.ts`)**
- `transformResponse(data, format, options)`: Main entry point
- `toSummaryFormat(listResponse, schemaProperties)`: Extract minimal page representations with top-level schema metadata
- `toTableFormat(listResponse, columns?)`: Generate Markdown table with all or specified columns

**3. Markdown Table Renderer (`src/formats/table-renderer.ts`)**
- `renderPageListAsTable(pages, columns, dataSource)`: Generate table
- `extractPropertyValue(page, propertyName)`: Reuse existing property extraction from `src/markdown/index.ts` (lines 310-402)
- `formatTableCell(value, propertyType)`: Compact representation for cells

**4. Schema Updates (`src/types/schemas.ts`)**
- Add `response_format` enum parameter to `queryDataSourceTool`
- Add `columns` array parameter for table format
- Update tool description with format examples

### Critical Design Decisions

**Decision 1: Format Parameter Naming**
- Use `response_format` (not `format`) to avoid conflict with existing `format` parameter used for markdown block conversion
- **Rationale:** Clear distinction between response structure and content rendering

**Decision 2: Summary Format Structure**
```typescript
{
  "object": "list",
  "summary_mode": true,
  "data_source_id": "7600ebff-5e0d-42ee-974f-8a372aaa3770",
  "schema": {
    "Status": { "type": "select" },
    "Type": { "type": "multi_select" },
    "IP Address": { "type": "url" },
    "Device": { "type": "relation" },
    "App": { "type": "title" }
  },
  "result_count": 964,
  "page_size": 100,
  "results": [
    {
      "id": "page-id",
      "title": "Page Title",
      "url": "https://notion.so/...",
      "last_edited_time": "2025-02-01T12:00:00.000Z"
    }
  ],
  "has_more": true,
  "next_cursor": "abc123",
  "drill_down_hint": "Use notion_retrieve_page with page.id to get full property values"
}
```
- **Rationale:** Preserves list structure for compatibility; schema at top level avoids redundancy; minimal per-item data maximizes result count per response

**Decision 3: Table Format Structure**
```markdown
# Data Source Query Results

**Query Summary:**
- Results: 100 (page 1 of 10)
- Data Source: `7600ebff-5e0d-42ee-974f-8a372aaa3770`
- Total Available: ~964+ items

## Results Table

| Title | Status | Type | IP Address | URL |
|-------|--------|------|------------|-----|
| Tautulli | Installed | Monitoring | http://192.168.1.72 | [Link](https://chewbacca.krm.dev) |
| VS Code Server | Installed | Management | http://192.168.1.72 | [Link](bb8.l.krm.dev) |
| Postgresql14 | Installed | Database | http://192.168.1.72:5432 | [Link](https://coruscant.l.krm.dev) |

## Pagination

**Next Page:** Use `start_cursor: "abc123"` in next query
**More Results:** 864 additional items available

## Drill-Down

To view full properties for a specific item:
```
notion_retrieve_page({ page_id: "05c33250-29b4-4316-8e3b-3fa04240a037" })
```
```
- **Rationale:** Human-readable format optimal for LLM processing; includes metadata context; provides actionable pagination and drill-down instructions

**Decision 4: Table Column Behavior**
When `columns` parameter omitted, table includes ALL properties from data source schema.
- **Rationale:** User prefers complete visibility; agents can specify `columns` if they want subset; avoids complexity of auto-selection algorithm
- **Implication:** Table format may exceed 25KB for wide schemas with many properties; user can specify `columns` to reduce width

**Decision 5: Property Value Truncation**
- Table cells truncated to 50 characters with "..." suffix
- Relations show count: "3 relations" instead of listing IDs
- Files show count: "2 files" instead of full URLs
- **Rationale:** Prevents single column from dominating table width; user can drill down for full values

### Data Models

**Format Options Enum:**
```typescript
type ResponseFormat = "json" | "summary" | "table";
```

**Transform Options Interface:**
```typescript
interface FormatOptions {
  response_format?: ResponseFormat;
  columns?: string[];  // Property names for table columns
  max_column_width?: number;  // Default: 50 chars
}
```

**Summary Page Representation:**
```typescript
interface SummaryPage {
  id: string;
  title: string;
  url: string;
  last_edited_time: string;
}

interface SummaryResponse {
  object: "list";
  summary_mode: true;
  data_source_id: string;
  schema: Record<string, { type: string }>;  // Property names and types at top level
  result_count: number;
  page_size: number;
  results: SummaryPage[];
  has_more: boolean;
  next_cursor: string | null;
  drill_down_hint: string;
}
```

## 4. Implementation Tasks

### Phase 1: Foundation (Core Transformation Logic)
- [x] **Task 1.1:** Create `src/formats/transformer.ts` module with `transformResponse()` entry point
- [x] **Task 1.2:** Implement schema fetching logic: call `notionClient.retrieveDataSource(data_source_id)` to get property definitions; extract property names and types into `{ [name]: { type } }` map
- [x] **Task 1.3:** Implement `toSummaryFormat()` function that extracts ID, title (using existing `extractPageTitle`), URL, timestamps at item level; includes fetched schema at top level as `schema` field
- [x] **Task 1.4:** Extract property value rendering logic from `src/markdown/index.ts` (lines 310-402) into reusable `src/formats/property-extractor.ts` utility
- [x] **Task 1.5:** Add unit tests for `toSummaryFormat()` covering pages with various property types; mock `retrieveDataSource` call

### Phase 2: Table Rendering
- [x] **Task 2.1:** Create `src/formats/table-renderer.ts` with `renderPageListAsTable()` function
- [x] **Task 2.2:** Implement all-columns default behavior when `columns` parameter omitted (extract all property names from schema)
- [x] **Task 2.3:** Implement cell value formatting with 50-char truncation and special handling for relations/files/rollups
- [x] **Task 2.4:** Generate table header, pagination section, and drill-down instructions template
- [x] **Task 2.5:** Add unit tests for table rendering with edge cases (empty results, missing properties, very long values)

### Phase 3: Server Integration
- [x] **Task 3.1:** Update `QueryDataSourceArgs` interface in `src/types/args.ts` to include `response_format?: string` and `columns?: string[]`
- [x] **Task 3.2:** Update `queryDataSourceTool` schema in `src/types/schemas.ts` to document new parameters with examples
- [x] **Task 3.3:** Modify `notion_query_data_source` handler in `src/server/index.ts` (lines 175-189) to extract format options, pass `notionClient` instance to transformer for schema fetching
- [x] **Task 3.4:** Add conditional logic to return text content for table format, JSON for summary format, preserving existing JSON format as default

### Phase 4: Testing & Validation
- [x] **Task 4.1:** Create integration test that queries a test data source with 100+ items and validates summary response size <25KB
- [x] **Task 4.2:** Create integration test that queries with `response_format: "table"` and validates Markdown table structure
- [x] **Task 4.3:** Create integration test that validates column auto-selection chooses expected properties
- [x] **Task 4.4:** Test backward compatibility: existing queries without `response_format` parameter work unchanged
- [x] **Task 4.5:** Manual testing with MCP Inspector using real Notion workspace with 500+ database items

### Phase 5: Documentation & Polish
- [x] **Task 5.1:** Update `README.md` with "Working with Large Datasets" section showing format examples
- [x] **Task 5.2:** Update `AGENTS.md` with guidance on when to use each format (summary for scanning, table for human review, json for processing)
- [x] **Task 5.3:** Add JSDoc comments to all new modules explaining format purposes and usage patterns
- [x] **Task 5.4:** Update tool schema descriptions with realistic examples showing 200+ item queries

## 5. Testing Strategy

### Unit Test Coverage

**Module: `src/formats/transformer.ts`**
- Summary transformation with various property types (select, multi-select, relation, date, text)
- Edge cases: pages with no title, missing properties, null values
- Pagination metadata preservation (`has_more`, `next_cursor`)

**Module: `src/formats/table-renderer.ts`**
- Column auto-selection with different property configurations
- Cell truncation at 50 chars
- Special formatting for relations (count display), files (count display), checkboxes (symbols)
- Empty result handling
- Markdown escaping in cell values

**Module: `src/formats/property-extractor.ts`**
- All 19 property types from existing implementation (title, rich_text, number, select, multi_select, date, people, files, checkbox, url, email, phone_number, formula, status, relation, rollup, created_by, created_time, last_edited_by, last_edited_time)
- Consistent API across extraction contexts

### Integration Test Coverage

**Scenario 1: Large Dataset Summary**
- Query data source with 200+ results using `response_format: "summary"`
- Verify response size <25KB
- Validate all IDs, titles, and property name lists present
- Confirm pagination metadata included

**Scenario 2: Table Format with Custom Columns**
- Query with `response_format: "table"` and `columns: ["Title", "Status", "Type"]`
- Verify Markdown table contains exactly specified columns
- Validate table is valid Markdown (parseable by standard parsers)

**Scenario 3: Table Format with All Columns**
- Query data source using `response_format: "table"` without `columns` parameter
- Verify table includes ALL properties from schema
- Measure token count to understand capacity limits

**Scenario 4: Backward Compatibility**
- Query without `response_format` parameter
- Verify response is full JSON (existing behavior)
- Ensure no breaking changes to response structure

### Edge Cases to Verify

1. **Empty query results** - Both summary and table formats handle zero results gracefully
2. **Single result** - Table doesn't break with just one row
3. **Property name collisions** - Handle properties with same name but different IDs
4. **Unicode in titles** - Emoji, CJK characters render correctly in tables
5. **Very long property values** - Truncation works for 1000+ char text fields
6. **Missing title property** - Summary format uses "Untitled" fallback
7. **Relation to deleted pages** - Handles relations to non-existent pages without errors
8. **Pagination edge case** - Last page with `has_more: false` shows correct guidance

## 6. Security & Performance Considerations

### Security
- **No new attack surface:** Transformation operates on already-fetched data; no additional API calls
- **Input validation:** `columns` parameter validated against actual property names to prevent injection attacks
- **No credential leakage:** Transformation doesn't access or expose token/auth data

### Performance

**Transformation Overhead:**
- Summary format: O(n) where n = number of results (single pass extraction)
- Table format: O(n × m) where m = selected columns (limited to 5 by default)
- Target: <100ms added latency for 100-result transformation

**Memory Impact:**
- Summary format reduces memory footprint by ~70% (drops full property values)
- Table format: Minimal memory overhead (renders to string incrementally)
- No caching required (transformations are stateless)

**Token Efficiency:**
- Summary format: ~150 tokens per page (vs ~350 tokens for full JSON)
- Table format: ~50 tokens per row for 5 columns (vs ~350 tokens per page)
- Target: 200+ pages in summary format within 25KB limit (verified via integration test)

### Scalability Considerations
- Transformation logic is stateless and can be parallelized if needed
- No impact on Notion API rate limits (operates post-fetch)
- Future optimization: Stream-based rendering for table format if memory becomes concern

## 7. Alternative Approaches Considered

### Alternative 1: Client-Side Pagination with Automatic Fetching
**Approach:** Server automatically fetches all pages using pagination and concatenates results.
**Rejected because:** 
- Violates single-responsibility principle (server becomes orchestrator)
- Increases latency (sequential API calls)
- Doesn't solve truncation problem for very large datasets (just delays it)
- Agent loses control over pagination strategy

### Alternative 2: Database-Side Filtering
**Approach:** Require agents to provide filters that reduce result set size.
**Rejected because:**
- Doesn't support "compare all data" use case
- Places burden on agent to know filter schema
- Some workflows require seeing everything (data audits, synchronization)

### Alternative 3: Binary Format or Compression
**Approach:** Use protobuf, msgpack, or gzip compression for responses.
**Rejected because:**
- MCP protocol uses JSON text format (protocol limitation)
- Would require changes to MCP SDK
- Compressed data still needs decompression in agent context (token cost)
- Doesn't improve LLM's ability to process large structured data

### Alternative 4: Result Streaming with Multiple Responses
**Approach:** Return results as stream of multiple MCP responses.
**Rejected because:**
- MCP tool call model is request-response, not streaming
- Would require significant protocol changes
- Complexity not warranted when pagination already works

## 8. Migration & Rollback Strategy

### Migration Path
This is a **non-breaking enhancement**:
1. Existing queries without `response_format` parameter continue returning full JSON
2. Agents opt into new formats explicitly by adding parameter
3. No database migrations, no configuration changes required
4. Can be deployed incrementally with feature flag (not implemented unless needed)

### Rollback Strategy
If critical issues found:
1. Revert server handler changes in `src/server/index.ts` (single file change)
2. New modules (`src/formats/*`) can remain (unused code, no runtime impact)
3. Schema updates are backward-compatible (new optional parameters)

### Deprecation Plan
No deprecation required. Full JSON format remains the default for foreseeable future.

## 9. Open Questions
*To be resolved before implementation begins*

**Q1:** Should table format support sorting by column (e.g., `sort_by: "Status"`)? 
- **Recommendation:** Not in MVP. Notion API already supports `sorts` parameter for query. Agents can sort before requesting table format.

**Q2:** Should table format support grouped rendering (e.g., group by Status value)?
- **Recommendation:** Not in MVP. Adds significant complexity. Can be future enhancement if requested.

**Q3:** What should happen if requested `columns` include property names that don't exist?
- **Recommendation:** Filter to existing properties silently, include warning in response metadata. Don't error (graceful degradation).

**Q4:** How should the transformer obtain data source schema for summary format?
- **Recommendation:** Require additional API call to `retrieveDataSource(data_source_id)` within transformation logic. Accept slight latency increase (~100-200ms) for schema fetch. Cache schema per data_source_id during session if performance becomes issue.

---

## 10. Success Metrics

**Quantitative:**
- Summary format supports 200+ pages within 25KB limit (measured via integration test)
- Table format supports 50+ pages within 25KB limit (measured via integration test)
- Transformation adds <100ms latency (measured via benchmarks)
- 0 breaking changes to existing queries (validated via regression tests)

**Qualitative:**
- Agents can successfully execute "compare all Notion data to external source" workflow (user validation)
- Table format output is human-readable for code review (manual inspection)
- Documentation examples enable agent to use formats without trial-and-error (user feedback)

## 11. Future Enhancements
*Out of scope for initial implementation*

1. **CSV Export Format** - `response_format: "csv"` for data analysis tools (deferred per user feedback)
2. **Compact JSON Format** - `response_format: "compact-json"` with abbreviated property names and stripped whitespace (deferred per user feedback)
3. **Table Grouping** - `group_by: "Status"` to render tables with categorical sections
4. **Search Highlighting** - When query includes text search, highlight matched terms in table
5. **Format Hints in Tool Schema** - Update schema to suggest format based on page_size (e.g., "For page_size > 50, consider response_format: 'table'")
6. **Markdown as Default** - User may want to switch table format to default for query responses; evaluate after MVP usage
