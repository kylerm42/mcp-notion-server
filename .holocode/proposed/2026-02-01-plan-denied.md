I've created a comprehensive specification at `.holocode/proposed/20260201-response-format-optimization/SPEC.md` that addresses your truncation issue with two new response formats:

## Core Solution

**1. Summary Format** (`response_format: "summary"`)
- Returns lightweight page representations: ID, title, URL, timestamps, and property name list (no values)
- Reduces each page from ~350 tokens to ~150 tokens (57% reduction)
- Supports 200+ results within 25KB limit
- Includes `properties_available` array so agents know what fields exist for drill-down

**2. Table Format** (`response_format: "table"`)
- Returns Markdown table with configurable columns
- Auto-selects top 5 most relevant properties when columns not specified (title, status, select, date, text priority)
- Truncates cells to 50 chars, shows counts for relations/files
- Supports 50+ results within 25KB with rich context
- Includes pagination instructions and drill-down examples

## Architecture Highlights

**Format Transformation Layer:**
```
[Notion API] → [Client] → [Format Transformer] → [MCP Response]
                                ↓
                    [summary | table | json]
```

**Key Design Decisions:**
1. **Backward compatible** - Existing queries without `response_format` return full JSON
2. **Reuses existing code** - Property extraction logic from markdown converter
3. **Column auto-selection** - Smart algorithm picks most useful properties for tables
4. **Token-optimized** - Both formats provide actionable data at <50% original size

## Summary Format Fields

Each page in summary contains:
- `id`, `title`, `url` (for retrieval and navigation)
- `parent` (data source context)
- `last_edited_time` (temporal awareness)
- `properties_available` (field names for drill-down)

**Open Question:** Should summary include sample values for 2-3 high-priority properties (e.g., Status, Type)? This would help agents make decisions without additional calls, while keeping size manageable.

## Implementation Plan

**5 Phases:**
1. Core transformation logic (summary format)
2. Table rendering with auto-selection
3. Server integration (update handler + schemas)
4. Testing (unit + integration with 100+ item datasets)
5. Documentation (README, AGENTS.md, JSDoc)

**Critical Test:** Integration test that validates 200-page summary response fits in <25KB.

## Use Case Coverage

✅ **Large dataset scanning** - Summary format lets agents see all 964 items  
✅ **Selective retrieval** - Table/summary show IDs for targeted `notion_retrieve_page` calls  
✅ **Data comparison** - Agents can fetch all data in chunks, compare with external source  
✅ **Human review** - Table format provides readable output for verification

## Next Steps

Please review the specification and provide feedback on:
1. Summary format fields - should we include sample property values?
2. Table column auto-selection priorities - does the algorithm match your expectations?
3. 50-char truncation for table cells - appropriate limit?
4. Any additional formats needed (CSV, compact-JSON)?

The spec is ready for implementation once approved.

---

# Plan Feedback

I've reviewed this plan and have 9 pieces of feedback:

## 1. Feedback on: "property name list (no values)"
> Is this list of properties at the top level or on each item?

## 2. Feedback on: "Auto-selects top 5 most relevant properties when columns not specified"
> I think I'd prefer it return all columns if nothing is specified for the table

## 3. Feedback on: "Existing queries without response_format return full JSON"
> I have a feeling I'll want to switch to markdown being the default for this view, but we can evaluate that later

## 4. Feedback on: "properties_available (field names for drill-down)"
> Since all the properties will be the same for all elements of the table, it doesn't seem necessary to have this on each item.

## 5. Feedback on: "Should summary include sample values for 2-3 high-priority properties"
> I think that's overkill, since data sources vary so widely in what's available and what's important

## 6. Feedback on: "Summary format fields - should we include sample property values?"
> No

## 7. Feedback on: "Table column auto-selection priorities - does the algorithm match your expectations?"
> No auto-selection, just the basic info

## 8. Feedback on: "50-char truncation for table cells - appropriate limit?"
> We can try it and adjust later if needed

## 9. Feedback on: "Any additional formats needed (CSV, compact-JSON)?"
> Not yet

---
