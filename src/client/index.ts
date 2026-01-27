/**
 * Notion API client wrapper
 */

import { convertToMarkdown } from "../markdown/index.js";
import {
  NotionResponse,
  BlockResponse,
  PageResponse,
  DatabaseResponse,
  ListResponse,
  UserResponse,
  CommentResponse,
  RichTextItemResponse,
  CreateDatabaseArgs,
} from "../types/index.js";
import fetch from "node-fetch";

export class NotionClientWrapper {
  private notionToken: string;
  private baseUrl: string = "https://api.notion.com/v1";
  private headers: { [key: string]: string };

  constructor(token: string) {
    this.notionToken = token;
    this.headers = {
      Authorization: `Bearer ${this.notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03",
    };
  }

  async appendBlockChildren(
    block_id: string,
    children: Partial<BlockResponse>[]
  ): Promise<BlockResponse> {
    const body = { children };

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  async retrieveBlock(block_id: string): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async retrieveBlockChildren(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children?${params}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async deleteBlock(block_id: string): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "DELETE",
      headers: this.headers,
    });

    return response.json();
  }

  async updateBlock(
    block_id: string,
    block: Partial<BlockResponse>
  ): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(block),
    });

    return response.json();
  }

  async retrievePage(page_id: string): Promise<PageResponse> {
    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  /**
   * Update page property values.
   * 
   * Note: This method updates property VALUES (not schemas).
   * For relation property values, provide an array of page IDs:
   * ```json
   * {
   *   "Projects": {
   *     "relation": [
   *       { "id": "page-id-1" },
   *       { "id": "page-id-2" }
   *     ]
   *   }
   * }
   * ```
   */
  async updatePageProperties(
    page_id: string,
    properties: Record<string, any>
  ): Promise<PageResponse> {
    const body = { properties };

    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async listAllUsers(
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveUser(user_id: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/users/${user_id}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveBotUser(): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  /**
   * Create a database with an initial data source.
   * 
   * IMPORTANT: For relation properties in the schema, use `data_source_id` (not `database_id`).
   * Example relation property schema:
   * ```json
   * {
   *   "Projects": {
   *     "type": "relation",
   *     "relation": {
   *       "data_source_id": "6c4240a9-a3ce-413e-9fd0-8a51a4d0a49b"
   *     }
   *   }
   * }
   * ```
   */
  async createDatabase(
    parent: CreateDatabaseArgs["parent"],
    properties: Record<string, any>,
    title?: RichTextItemResponse[],
    icon?: Record<string, any>,
    cover?: Record<string, any>
  ): Promise<DatabaseResponse> {
    const body: Record<string, any> = {
      parent,
      initial_data_source: { properties },
    };
    if (title) body.title = title;
    if (icon) body.icon = icon;
    if (cover) body.cover = cover;

    const response = await fetch(`${this.baseUrl}/databases`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async queryDataSource(
    data_source_id: string,
    filter?: Record<string, any>,
    sorts?: Array<{
      property?: string;
      timestamp?: string;
      direction: "ascending" | "descending";
    }>,
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const body: Record<string, any> = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    const response = await fetch(
      `${this.baseUrl}/data_sources/${data_source_id}/query`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  async retrieveDatabase(database_id: string): Promise<DatabaseResponse> {
    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "GET",
      headers: this.headers,
    });

    // Response includes data_sources[] field in API version 2025-09-03
    return response.json();
  }

  async retrieveDataSource(data_source_id: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/data_sources/${data_source_id}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async updateDatabase(
    database_id: string,
    title?: RichTextItemResponse[],
    icon?: Record<string, any>,
    cover?: Record<string, any>,
    parent?: Record<string, any>,
    is_inline?: boolean
  ): Promise<DatabaseResponse> {
    const body: Record<string, any> = {};
    if (title) body.title = title;
    if (icon) body.icon = icon;
    if (cover) body.cover = cover;
    if (parent) body.parent = parent;
    if (is_inline !== undefined) body.is_inline = is_inline;

    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * Update data source schema and configuration.
   * 
   * IMPORTANT: For relation properties in the schema, use `data_source_id` (not `database_id`).
   * Example relation property schema:
   * ```json
   * {
   *   "Projects": {
   *     "type": "relation",
   *     "relation": {
   *       "data_source_id": "6c4240a9-a3ce-413e-9fd0-8a51a4d0a49b"
   *     }
   *   }
   * }
   * ```
   */
  async updateDataSource(
    data_source_id: string,
    properties?: Record<string, any>,
    title?: RichTextItemResponse[]
  ): Promise<any> {
    const body: Record<string, any> = {};
    if (properties) body.properties = properties;
    if (title) body.title = title;

    const response = await fetch(
      `${this.baseUrl}/data_sources/${data_source_id}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  /**
   * Create a new page (item) in a data source.
   * 
   * Note: This method sets property VALUES (not schemas).
   * For relation property values, provide an array of page IDs:
   * ```json
   * {
   *   "Projects": {
   *     "relation": [
   *       { "id": "page-id-1" },
   *       { "id": "page-id-2" }
   *     ]
   *   }
   * }
   * ```
   */
  async createDataSourceItem(
    data_source_id: string,
    properties: Record<string, any>
  ): Promise<PageResponse> {
    const body = {
      parent: { type: "data_source_id", data_source_id },
      properties,
    };

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async createComment(
    parent?: { page_id: string },
    discussion_id?: string,
    rich_text?: RichTextItemResponse[]
  ): Promise<CommentResponse> {
    const body: Record<string, any> = { rich_text };
    if (parent) {
      body.parent = parent;
    }
    if (discussion_id) {
      body.discussion_id = discussion_id;
    }

    const response = await fetch(`${this.baseUrl}/comments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async retrieveComments(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    params.append("block_id", block_id);
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/comments?${params.toString()}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async search(
    query?: string,
    filter?: { property: string; value: string },
    sort?: {
      direction: "ascending" | "descending";
      timestamp: "last_edited_time";
    },
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const body: Record<string, any> = {};
    if (query) body.query = query;
    if (filter) body.filter = filter;
    if (sort) body.sort = sort;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    const response = await fetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async toMarkdown(response: NotionResponse): Promise<string> {
    return convertToMarkdown(response);
  }
}
