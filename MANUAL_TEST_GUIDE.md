# Manual Testing Guide: Response Format Optimization

This guide provides step-by-step instructions for manually validating the response format optimization feature using MCP Inspector with a real Notion workspace.

## Prerequisites

1. **MCP Inspector installed**: Run `npm run inspector` to launch
2. **Notion workspace** with a database containing 500+ items
3. **Environment variable set**: `NOTION_API_TOKEN` must be configured
4. **Server build**: Run `npm run build` to ensure latest code is compiled

## Setup

### Step 1: Launch MCP Inspector

```bash
npm run inspector
```

This will start the MCP Inspector UI in your browser.

### Step 2: Configure Server

In the MCP Inspector UI:
1. Connect to the `notion-read-only` server (or your configured server name)
2. Verify connection status shows "Connected"
3. Confirm tools are loaded (check for `notion_query_data_source` in tool list)

### Step 3: Prepare Test Database

You need a Notion database with:
- At least 500 items for realistic testing
- Multiple property types (title, select, multi-select, relation, URL, etc.)
- Varied data in properties to test rendering

**Get the database ID:**
1. Open your Notion database in a browser
2. Copy the database ID from the URL: `https://www.notion.so/{database-id}?v=...`
3. Format: 32-character UUID (e.g., `7600ebff5e0d42ee974f8a372aaa3770`)

## Test Case 1: Summary Format with Large Dataset

**Objective:** Verify summary format handles 500+ items efficiently and stays within MCP limits.

### Steps

1. **Retrieve Database Metadata**

   First, get the data source ID from your database:

   ```json
   {
     "tool": "notion_retrieve_database",
     "arguments": {
       "database_id": "YOUR_DATABASE_ID_HERE"
     }
   }
   ```

   **Expected Result:** Response contains a `data_sources` array. Note the first data source `id` field.

2. **Query with Summary Format**

   Use the data source ID from step 1:

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "summary",
       "page_size": 100
     }
   }
   ```

   **Expected Results:**
   - Response contains `summary_mode: true`
   - Schema appears once at top level with all property names and types
   - Results array contains minimal page representations:
     - `id`: Page ID
     - `title`: Page title (or "Untitled")
     - `url`: Page URL
     - `last_edited_time`: Timestamp
   - No full property values in results
   - Pagination metadata: `has_more`, `next_cursor` if applicable
   - Drill-down hint: Instructions for using `notion_retrieve_page`
   - **Response size < 25KB** (check in Inspector's response panel)

3. **Verify Pagination**

   If `has_more: true` in the response, test pagination:

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "summary",
       "page_size": 100,
       "start_cursor": "CURSOR_FROM_PREVIOUS_RESPONSE"
     }
   }
   ```

   **Expected Result:** Next page of results with different items.

### Validation Checklist

- [ ] Response size stays under 25KB even with 100+ items
- [ ] Schema includes all database properties
- [ ] All page titles are readable and correct
- [ ] Pagination cursors work for fetching next pages
- [ ] Drill-down hint is clear and actionable

## Test Case 2: Table Format with All Columns

**Objective:** Verify table format produces human-readable Markdown with all properties visible.

### Steps

1. **Query with Table Format (All Columns)**

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "table",
       "page_size": 50
     }
   }
   ```

   **Expected Results:**
   - Response is a Markdown string (not JSON)
   - Contains sections:
     - `# Data Source Query Results`
     - `## Query Summary` with result count and data source ID
     - `## Results Table` with Markdown table
     - `## Pagination` with next cursor if applicable
     - `## Drill-Down` with instructions
   - Table includes ALL properties from database as columns
   - Table is properly formatted (aligned pipes, header separator)
   - Cell values are truncated to ~50 characters if too long
   - Relations show count (e.g., "3 relations")
   - Files show count (e.g., "2 files")

2. **Validate Markdown Rendering**

   Copy the Markdown response and paste into a Markdown viewer (e.g., GitHub Gist, Notion itself, or a local Markdown editor).

   **Expected Result:** Table renders correctly with readable formatting.

### Validation Checklist

- [ ] All database properties appear as columns
- [ ] Table header row is present and correct
- [ ] Separator row uses correct syntax (`|---|---|`)
- [ ] All 50 rows are visible in table
- [ ] Long text values are truncated with "..."
- [ ] Relations display as count instead of IDs
- [ ] Pagination section shows correct cursor
- [ ] Drill-down example uses correct tool name

## Test Case 3: Table Format with Selected Columns

**Objective:** Verify column selection filters table to requested properties only.

### Steps

1. **Identify Available Properties**

   From Test Case 1 or 2, note the property names in your database schema (e.g., "Title", "Status", "Type", "IP Address").

2. **Query with Specific Columns**

   Choose 2-4 properties to include:

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "table",
       "columns": ["Title", "Status", "Type"],
       "page_size": 50
     }
   }
   ```

   **Expected Results:**
   - Table header contains ONLY specified columns: `| Title | Status | Type |`
   - No other properties appear in table
   - Data rows contain only values for specified columns
   - Table is narrower and more focused

3. **Test with Non-Existent Column**

   Include a property name that doesn't exist:

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "table",
       "columns": ["Title", "NonExistent", "Status"],
       "page_size": 50
     }
   }
   ```

   **Expected Result:** Table includes only "Title" and "Status" columns (filters out non-existent property gracefully).

### Validation Checklist

- [ ] Only requested columns appear in table
- [ ] Column order matches requested order
- [ ] Non-existent columns are silently filtered out
- [ ] Table remains valid Markdown

## Test Case 4: Backward Compatibility

**Objective:** Verify existing queries without `response_format` parameter work unchanged.

### Steps

1. **Query Without Format Parameter (Default Behavior)**

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "page_size": 10
     }
   }
   ```

   **Expected Results:**
   - Response is full JSON (not summary or table)
   - Each page object includes complete `properties` field
   - All property values are present in full detail
   - Response structure matches pre-optimization behavior
   - No `summary_mode` field
   - No Markdown formatting

2. **Query with Explicit JSON Format**

   ```json
   {
     "tool": "notion_query_data_source",
     "arguments": {
       "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
       "response_format": "json",
       "page_size": 10
     }
   }
   ```

   **Expected Result:** Same as above (full JSON response).

### Validation Checklist

- [ ] Default behavior (no `response_format`) returns full JSON
- [ ] Explicit `"json"` format returns full JSON
- [ ] Full property objects are intact
- [ ] No breaking changes to response structure

## Test Case 5: Edge Cases

### Test 5.1: Empty Results

**Query:**
```json
{
  "tool": "notion_query_data_source",
  "arguments": {
    "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
    "response_format": "table",
    "filter": {
      "property": "Status",
      "select": {
        "equals": "NonExistentValue"
      }
    }
  }
}
```

**Expected:** Table with 0 results, "Results: 0" in summary section.

### Test 5.2: Single Result

**Query:**
```json
{
  "tool": "notion_query_data_source",
  "arguments": {
    "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
    "response_format": "table",
    "page_size": 1
  }
}
```

**Expected:** Valid table with 1 data row.

### Test 5.3: Unicode and Emoji

Find or create a page with emoji in title (e.g., "🚀 Rocket Project").

**Query:**
```json
{
  "tool": "notion_query_data_source",
  "arguments": {
    "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
    "response_format": "summary",
    "page_size": 10
  }
}
```

**Expected:** Emoji appears correctly in title field.

### Test 5.4: Very Long Property Values

If database has long text properties (>100 characters):

**Query:**
```json
{
  "tool": "notion_query_data_source",
  "arguments": {
    "data_source_id": "YOUR_DATA_SOURCE_ID_HERE",
    "response_format": "table",
    "page_size": 10
  }
}
```

**Expected:** Long values truncated to ~50 chars with "..." suffix in table.

## Performance Testing

### Token Efficiency Measurement

Compare response sizes for same query with different formats:

1. **Full JSON**
   ```json
   { "data_source_id": "...", "page_size": 100 }
   ```
   Note response size in Inspector.

2. **Summary Format**
   ```json
   { "data_source_id": "...", "response_format": "summary", "page_size": 100 }
   ```
   Note response size in Inspector.

3. **Table Format**
   ```json
   { "data_source_id": "...", "response_format": "table", "page_size": 100 }
   ```
   Note response size in Inspector.

**Expected:**
- Summary format: ~60-70% smaller than full JSON
- Table format: ~70-80% smaller than full JSON
- Both fit within 25KB limit for 100+ items

## Troubleshooting

### Issue: "Missing required argument: data_source_id"

**Solution:** Ensure you're using the data source ID (from `notion_retrieve_database`), not the database ID.

### Issue: Response is JSON instead of Markdown table

**Solution:** Check `response_format` is exactly `"table"` (lowercase, in quotes).

### Issue: Non-existent columns appear in table

**Solution:** Verify column names exactly match property names in schema (case-sensitive).

### Issue: Table looks broken in Inspector

**Solution:** Copy Markdown to external viewer. Inspector may not render Markdown tables.

### Issue: "Unsupported format" error

**Solution:** Valid formats are: `"json"`, `"summary"`, `"table"`. Check spelling and quotes.

## Success Criteria

Manual testing is successful when:

- [ ] Summary format handles 200+ items within 25KB
- [ ] Table format produces valid, readable Markdown
- [ ] Column selection correctly filters table columns
- [ ] Default (no format) returns full JSON unchanged
- [ ] Edge cases (empty, single, Unicode) work correctly
- [ ] Performance shows significant size reduction vs. full JSON

## Reporting Issues

If you encounter issues during manual testing:

1. Note the exact query arguments used
2. Capture the error message or unexpected response
3. Record the database schema (property names and types)
4. Note the data source ID and database ID used
5. Report to development team with reproduction steps
