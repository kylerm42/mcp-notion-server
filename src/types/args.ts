/**
 * Type definitions for tool arguments
 */

import { RichTextItemResponse, BlockResponse } from "./responses.js";

// Blocks
export interface AppendBlockChildrenArgs {
  block_id: string;
  children: Partial<BlockResponse>[];
  after?: string;
  format?: "json" | "markdown";
}

export interface RetrieveBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface RetrieveBlockChildrenArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface DeleteBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface UpdateBlockArgs {
  block_id: string;
  block: Partial<BlockResponse>;
  format?: "json" | "markdown";
}

// Pages
export interface RetrievePageArgs {
  page_id: string;
  format?: "json" | "markdown";
}

export interface UpdatePagePropertiesArgs {
  page_id: string;
  /**
   * Property values to update.
   * For relation property values, provide an array of page IDs.
   * 
   * Example with relation value:
   * ```json
   * {
   *   "Projects": { "relation": [{ "id": "page-id-1" }, { "id": "page-id-2" }] }
   * }
   * ```
   */
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

// Users
export interface ListAllUsersArgs {
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface RetrieveUserArgs {
  user_id: string;
  format?: "json" | "markdown";
}

export interface RetrieveBotUserArgs {
  // No parameters needed
}

// Databases
export interface CreateDatabaseArgs {
  parent: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
  title?: RichTextItemResponse[];
  /**
   * Property schema definitions for the initial data source.
   * For relation properties, use `data_source_id` (not `database_id`).
   * 
   * Example with relation:
   * ```json
   * {
   *   "Name": { "title": {} },
   *   "Projects": {
   *     "type": "relation",
   *     "relation": { "data_source_id": "6c4240a9-a3ce-413e-9fd0-8a51a4d0a49b" }
   *   }
   * }
   * ```
   */
  properties: Record<string, any>;
  icon?: {
    type: string;
    emoji?: string;
    [key: string]: any;
  };
  cover?: {
    type: string;
    [key: string]: any;
  };
  initial_data_source?: {
    properties: Record<string, any>;
  };
  format?: "json" | "markdown";
}

export interface QueryDataSourceArgs {
  data_source_id: string;
  filter?: Record<string, any>;
  sorts?: Array<{
    property?: string;
    timestamp?: string;
    direction: "ascending" | "descending";
  }>;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface RetrieveDatabaseArgs {
  database_id: string;
  format?: "json" | "markdown";
}

export interface UpdateDatabaseArgs {
  database_id: string;
  title?: RichTextItemResponse[];
  icon?: {
    type: string;
    emoji?: string;
    [key: string]: any;
  };
  cover?: {
    type: string;
    [key: string]: any;
  };
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
  is_inline?: boolean;
  format?: "json" | "markdown";
}

export interface CreateDataSourceItemArgs {
  data_source_id: string;
  /**
   * Property values for the new page.
   * For relation property values, provide an array of page IDs.
   * 
   * Example with relation value:
   * ```json
   * {
   *   "Name": { "title": [{ "text": { "content": "Task 1" } }] },
   *   "Projects": { "relation": [{ "id": "page-id-1" }, { "id": "page-id-2" }] }
   * }
   * ```
   */
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

// Data Sources
export interface RetrieveDataSourceArgs {
  data_source_id: string;
  format?: "json" | "markdown";
}

export interface UpdateDataSourceArgs {
  data_source_id: string;
  /**
   * Property schema updates for the data source.
   * For relation properties, use `data_source_id` (not `database_id`).
   * 
   * Example with relation schema:
   * ```json
   * {
   *   "Projects": {
   *     "type": "relation",
   *     "relation": { "data_source_id": "6c4240a9-a3ce-413e-9fd0-8a51a4d0a49b" }
   *   }
   * }
   * ```
   */
  properties?: Record<string, any>;
  title?: RichTextItemResponse[];
  format?: "json" | "markdown";
}

// Comments
export interface CreateCommentArgs {
  parent?: { page_id: string };
  discussion_id?: string;
  rich_text: RichTextItemResponse[];
  format?: "json" | "markdown";
}

export interface RetrieveCommentsArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

// Search
export interface SearchArgs {
  query?: string;
  filter?: { property: string; value: string };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}
