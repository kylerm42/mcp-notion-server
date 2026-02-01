/**
 * Markdown table renderer for Notion pages
 * 
 * Converts Notion page list responses into human-readable Markdown tables
 * with configurable columns, pagination metadata, and drill-down instructions.
 * 
 * Features:
 * - Automatic column selection (all properties if columns not specified)
 * - Cell value truncation (50 chars default)
 * - Special formatting for relations, files, rollups
 * - Pagination guidance
 * - Drill-down instructions for detailed page retrieval
 */

import { PageResponse } from "../types/index.js";
import { extractPageTitle, extractPropertyValue } from "./property-extractor.js";
import { logger } from "../logger.js";

/**
 * Renders a list of Notion pages as a Markdown table
 * 
 * @param pages - Array of page objects from Notion API query
 * @param columns - Property names to include as columns (undefined = all properties)
 * @param dataSourceId - ID of the data source being queried
 * @param schema - Property schema from data source (property names and types)
 * @param hasMore - Whether more results are available for pagination
 * @param nextCursor - Cursor for next page of results
 * @param maxColumnWidth - Maximum characters per cell before truncation (default: 50)
 * @returns Markdown-formatted table with query summary, results, pagination, and drill-down sections
 * 
 * @example All columns
 * ```typescript
 * const table = await renderPageListAsTable(
 *   pages,
 *   undefined,  // All columns
 *   "7600ebff-5e0d-42ee-974f-8a372aaa3770",
 *   schema,
 *   true,
 *   "cursor-123"
 * );
 * ```
 * 
 * @example Selected columns
 * ```typescript
 * const table = await renderPageListAsTable(
 *   pages,
 *   ["Title", "Status", "Priority"],
 *   "7600ebff-5e0d-42ee-974f-8a372aaa3770",
 *   schema,
 *   false,
 *   null
 * );
 * ```
 */
export async function renderPageListAsTable(
  pages: PageResponse[],
  columns: string[] | undefined,
  dataSourceId: string,
  schema: Record<string, { type: string }>,
  hasMore: boolean,
  nextCursor: string | null,
  maxColumnWidth: number = 50
): Promise<string> {
  // Determine which columns to include
  const selectedColumns = columns && columns.length > 0 
    ? columns 
    : Object.keys(schema);

  // Filter to only columns that exist in schema
  const validColumns = selectedColumns.filter(col => {
    if (!schema[col]) {
      logger.warn(`Column "${col}" not found in schema, skipping`);
      return false;
    }
    return true;
  });

  // Add Title column if not already present (always want to show title)
  const finalColumns = validColumns.includes("Title") 
    ? validColumns 
    : ["Title", ...validColumns];

  // Build output sections
  const sections: string[] = [];

  // Query Summary section
  sections.push("# Data Source Query Results");
  sections.push("");
  sections.push("**Query Summary:**");
  sections.push(`- Results: ${pages.length}${hasMore ? ` (page 1+)` : ""}`);
  sections.push(`- Data Source: \`${dataSourceId}\``);
  if (hasMore) {
    sections.push(`- More items available`);
  }
  sections.push("");

  // Results Table section
  sections.push("## Results Table");
  sections.push("");

  if (pages.length === 0) {
    sections.push("*No results found*");
  } else {
    // Generate table header
    const headerRow = `| ${finalColumns.join(" | ")} |`;
    const separatorRow = `|${finalColumns.map(() => "-------").join("|")}|`;
    
    sections.push(headerRow);
    sections.push(separatorRow);

    // Generate table rows
    for (const page of pages) {
      const cells: string[] = [];
      
      for (const columnName of finalColumns) {
        const cellValue = extractCellValue(page, columnName, schema, maxColumnWidth);
        cells.push(cellValue);
      }
      
      sections.push(`| ${cells.join(" | ")} |`);
    }
  }

  sections.push("");

  // Pagination section
  if (hasMore || nextCursor) {
    sections.push("## Pagination");
    sections.push("");
    
    if (nextCursor) {
      sections.push(`**Next Page:** Use \`start_cursor: "${nextCursor}"\` in next query`);
    }
    
    if (hasMore) {
      sections.push(`**More Results:** Additional items available`);
    }
    
    sections.push("");
  }

  // Drill-Down section
  if (pages.length > 0) {
    sections.push("## Drill-Down");
    sections.push("");
    sections.push("To view full properties for a specific item:");
    sections.push("```");
    sections.push(`notion_retrieve_page({ page_id: "${pages[0].id}" })`);
    sections.push("```");
  }

  return sections.join("\n");
}

/**
 * Extracts and formats a cell value for table display
 * @param page - Page object
 * @param columnName - Property name
 * @param schema - Property schema
 * @param maxWidth - Maximum character width
 * @returns Formatted cell value
 */
function extractCellValue(
  page: PageResponse,
  columnName: string,
  schema: Record<string, { type: string }>,
  maxWidth: number
): string {
  // Special handling for Title column
  if (columnName === "Title") {
    const title = extractPageTitle(page.properties) || "Untitled";
    return formatTableCell(title, "title", maxWidth);
  }

  // Find property in page
  const property = page.properties[columnName];
  
  if (!property) {
    return "";
  }

  const propertyType = schema[columnName]?.type || property.type;
  
  // Extract value using existing utility
  const rawValue = extractPropertyValue(property);
  
  // Apply table-specific formatting
  return formatTableCell(rawValue, propertyType, maxWidth);
}

/**
 * Formats a property value for table cell display with special handling
 * @param value - Raw property value
 * @param propertyType - Property type
 * @param maxWidth - Maximum character width
 * @returns Formatted cell value
 */
function formatTableCell(value: string, propertyType: string, maxWidth: number): string {
  if (!value) return "";

  // Special handling for relation properties - show count
  if (propertyType === "relation") {
    const relations = value.split(",").map(r => r.trim()).filter(r => r.length > 0);
    const count = relations.length;
    return count === 0 ? "" : count === 1 ? "1 relation" : `${count} relations`;
  }

  // Special handling for files - show count
  if (propertyType === "files") {
    // Extract file count from markdown links
    const fileMatches = value.match(/\[.*?\]\(.*?\)/g) || [];
    const count = fileMatches.length;
    return count === 0 ? "" : count === 1 ? "1 file" : `${count} files`;
  }

  // Special handling for rollup - simplify display
  if (propertyType === "rollup") {
    // If it's JSON array, just show "Rollup"
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return "Rollup";
        }
      } catch {
        // Not valid JSON, continue with normal handling
      }
    }
  }

  // Escape pipe characters to prevent table breakage
  let escapedValue = value.replace(/\|/g, "\\|");

  // Truncate long values
  if (escapedValue.length > maxWidth) {
    escapedValue = escapedValue.substring(0, maxWidth - 3) + "...";
  }

  return escapedValue;
}
