/**
 * Response format transformation module
 * 
 * Provides token-efficient response formats for Notion data source queries:
 * - Summary format: Lightweight page representations for large datasets (200+ pages in <25KB)
 * - Table format: Markdown tables for human-readable output (50+ pages in <25KB)
 * 
 * Usage:
 * ```typescript
 * const transformed = await transformResponse(
 *   listResponse,
 *   dataSourceId,
 *   "summary",  // or "table"
 *   notionClient,
 *   ["Column1", "Column2"]  // Optional: for table format
 * );
 * ```
 * 
 * @see {@link https://github.com/kylermintah/mcp-notion-server} for format documentation
 */

import { NotionClientWrapper } from "../client/index.js";
import { ListResponse, PageResponse, DataSourceResponse } from "../types/index.js";
import { extractPageTitle } from "./property-extractor.js";
import { renderPageListAsTable } from "./table-renderer.js";
import { logger } from "../logger.js";

/**
 * Response format types
 */
export type ResponseFormat = "json" | "summary" | "table";

/**
 * Format transformation options
 */
export interface FormatOptions {
  response_format?: ResponseFormat;
  columns?: string[];
  max_column_width?: number;
}

/**
 * Minimal page representation for summary format
 */
export interface SummaryPage {
  id: string;
  title: string;
  url: string;
  last_edited_time: string;
}

/**
 * Summary format response structure
 */
export interface SummaryResponse {
  object: "list";
  summary_mode: true;
  data_source_id: string;
  schema: Record<string, { type: string }>;
  result_count: number;
  page_size: number;
  results: SummaryPage[];
  has_more: boolean;
  next_cursor: string | null;
  drill_down_hint: string;
}

/**
 * Transforms a Notion list response to the specified format
 * 
 * @param listResponse - Raw Notion API list response
 * @param dataSourceId - ID of the data source being queried
 * @param format - Target format: "summary" for lightweight JSON, "table" for Markdown
 * @param notionClient - Client instance for fetching schema
 * @param columns - Optional array of property names for table columns (table format only)
 * @returns Transformed response (object for summary, string for table)
 * @throws {Error} If format is unsupported
 * 
 * @example Summary format
 * ```typescript
 * const summary = await transformResponse(
 *   apiResponse,
 *   "7600ebff-5e0d-42ee-974f-8a372aaa3770",
 *   "summary",
 *   client
 * );
 * // Returns: { summary_mode: true, schema: {...}, results: [...] }
 * ```
 * 
 * @example Table format
 * ```typescript
 * const table = await transformResponse(
 *   apiResponse,
 *   "7600ebff-5e0d-42ee-974f-8a372aaa3770",
 *   "table",
 *   client,
 *   ["Title", "Status"]
 * );
 * // Returns: Markdown table string
 * ```
 */
export async function transformResponse(
  listResponse: any,
  dataSourceId: string,
  format: "summary" | "table",
  notionClient: NotionClientWrapper,
  columns?: string[]
): Promise<any> {
  if (format === "summary") {
    return toSummaryFormat(listResponse, notionClient, dataSourceId);
  } else if (format === "table") {
    return toTableFormat(listResponse, dataSourceId, notionClient, columns);
  }
  
  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Fetches data source schema and extracts property definitions
 * @param notionClient Client instance
 * @param dataSourceId Data source ID
 * @returns Map of property names to types
 */
async function fetchSchema(
  notionClient: NotionClientWrapper,
  dataSourceId: string
): Promise<Record<string, { type: string }>> {
  try {
    const startTime = Date.now();
    const dataSource: DataSourceResponse = await notionClient.retrieveDataSource(dataSourceId);
    const duration = Date.now() - startTime;
    
    const schema: Record<string, { type: string }> = {};
    
    if (dataSource.properties) {
      for (const [propertyName, propertyConfig] of Object.entries(dataSource.properties)) {
        if (propertyConfig && typeof propertyConfig === "object" && "type" in propertyConfig) {
          schema[propertyName] = { type: propertyConfig.type };
        }
      }
    }
    
    logger.debug(`Schema fetched in ${duration}ms for data source ${dataSourceId}`);
    return schema;
  } catch (error) {
    logger.warn(`Failed to fetch schema for data source ${dataSourceId}: ${error}`);
    return {};
  }
}

/**
 * Converts a list response to summary format
 * @param listResponse Original list response
 * @param notionClient Client instance for schema fetching
 * @param dataSourceId Data source ID
 * @returns Summary format response
 */
export async function toSummaryFormat(
  listResponse: ListResponse,
  notionClient: NotionClientWrapper,
  dataSourceId: string
): Promise<SummaryResponse> {
  // Fetch schema from data source
  const schema = await fetchSchema(notionClient, dataSourceId);

  // Extract minimal page representations
  const summaryPages: SummaryPage[] = listResponse.results
    .filter((result): result is PageResponse => result.object === "page")
    .map((page) => {
      const title = extractPageTitle(page.properties) || "Untitled";
      return {
        id: page.id,
        title,
        url: page.url || "",
        last_edited_time: page.last_edited_time || "",
      };
    });

  // Build summary response
  const summaryResponse: SummaryResponse = {
    object: "list",
    summary_mode: true,
    data_source_id: dataSourceId,
    schema,
    result_count: summaryPages.length,
    page_size: summaryPages.length,
    results: summaryPages,
    has_more: listResponse.has_more || false,
    next_cursor: listResponse.next_cursor || null,
    drill_down_hint: "Use notion_retrieve_page with page.id to get full property values",
  };

  return summaryResponse;
}

/**
 * Transforms a Notion list response into Markdown table format
 * @param listResponse Original list response
 * @param dataSourceId Data source ID
 * @param notionClient Client instance for schema fetching
 * @param columns Optional column selection
 * @returns Markdown table string
 */
async function toTableFormat(
  listResponse: any,
  dataSourceId: string,
  notionClient: NotionClientWrapper,
  columns?: string[]
): Promise<string> {
  const schema = await fetchSchema(notionClient, dataSourceId);
  
  return renderPageListAsTable(
    listResponse.results || [],
    columns,
    dataSourceId,
    schema,
    listResponse.has_more || false,
    listResponse.next_cursor || null
  );
}
