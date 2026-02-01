I've revised the specification based on your feedback. Key changes:

## Feedback Addressed

**1. Schema Location** (Feedback #1, #4)
- `schema` now at **top level** of summary response, not per-item
- Structure: `{ "Status": { "type": "select" }, "App": { "type": "title" }, ... }`
- Eliminates redundancy across 200+ results

**2. Table Columns** (Feedback #2, #7)
- **All properties included** when `columns` parameter omitted
- No auto-selection algorithm (removed Decision 4 complexity)
- User explicitly specifies `columns: ["Title", "Status"]` if subset needed

**3. No Sample Values** (Feedback #5, #6)
- Removed `sample_properties` from summary format
- Per-item data: only ID, title, URL, timestamp (minimal)
- Agents use drill-down pattern for property values

**4. Simplified Design** (Feedback #3, #8, #9)
- JSON remains default (markdown evaluation deferred)
- 50-char truncation proceeds (adjust later if needed)
- No CSV/compact formats in scope

## Revised Summary Format

```json
{
  "object": "list",
  "summary_mode": true,
  "data_source_id": "7600ebff...",
  "schema": {
    "Status": { "type": "select" },
    "Type": { "type": "multi_select" },
    "IP Address": { "type": "url" },
    "App": { "type": "title" }
  },
  "results": [
    {
      "id": "page-id",
      "title": "Tautulli",
      "url": "https://notion.so/...",
      "last_edited_time": "2025-02-01T12:00:00.000Z"
    }
  ],
  "has_more": true,
  "next_cursor": "abc123"
}
```

**Token Efficiency:**
- ~100 tokens for schema (one-time overhead)
- ~80 tokens per item (vs ~350 for full page)
- **Capacity:** 250+ pages within 25KB

## Revised Table Format

When `columns` omitted:
- Renders **ALL properties** from schema
- May exceed 25KB for very wide schemas (10+ properties)
- User specifies `columns` to reduce width if needed

Example with all columns:
```markdown
| App | Status | Type | IP Address | URL | Device | Relates To |
|-----|--------|------|------------|-----|--------|------------|
| Tautulli | Installed | Monitoring | http://... | [Link](...) | 1 relation | 1 relation |
```

## Implementation Impact

**New Requirement:**
- Transformer must fetch data source schema via `notionClient.retrieveDataSource(data_source_id)` 
- Adds ~100-200ms latency for schema lookup (acceptable per NFR)
- Can add caching if performance becomes issue

**Phase Updates:**
- Task 1.2: Schema fetching logic
- Task 1.3: Top-level schema inclusion in summary
- Task 2.2: All-columns default (removed auto-selection)
- Task 3.3: Pass client instance to transformer

## Validation

All acceptance criteria updated:
- FR-1: Summary with top-level schema ✓
- FR-3: All columns default ✓  
- FR-7: Schema-level metadata ✓
- Removed FR-4 (auto-selection)

Ready for implementation approval.