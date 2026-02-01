/**
 * Schema definitions for Notion API tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  commonIdDescription,
  formatParameter,
  richTextObjectSchema,
  blockObjectSchema,
  getFilteredBlockSchema,
} from "./common.js";

// Blocks tools
export const appendBlockChildrenTool: Tool = {
  name: "notion_append_block_children",
  description:
    "Append new children blocks to a specified parent block in Notion. Requires insert content capabilities. You can optionally specify the 'after' parameter to append after a certain block.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the parent block." + commonIdDescription,
      },
      children: {
        type: "array",
        description:
          "Array of block objects to append. Each block must follow the Notion block schema.",
        items: blockObjectSchema,
      },
      after: {
        type: "string",
        description:
          "The ID of the existing block that the new block should be appended after." +
          commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["block_id", "children"],
  },
};

export const retrieveBlockTool: Tool = {
  name: "notion_retrieve_block",
  description: "Retrieve a block from Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to retrieve." + commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const retrieveBlockChildrenTool: Tool = {
  name: "notion_retrieve_block_children",
  description: "Retrieve the children of a block",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block." + commonIdDescription,
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const deleteBlockTool: Tool = {
  name: "notion_delete_block",
  description: "Delete a block in Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to delete." + commonIdDescription,
      },
    },
    required: ["block_id"],
  },
};

export const updateBlockTool: Tool = {
  name: "notion_update_block",
  description:
    "Update the content of a block in Notion based on its type. The update replaces the entire value for a given field.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to update." + commonIdDescription,
      },
      block: {
        type: "object",
        description:
          "The updated content for the block. Must match the block's type schema.",
      },
      format: formatParameter,
    },
    required: ["block_id", "block"],
  },
};

// Pages tools
export const retrievePageTool: Tool = {
  name: "notion_retrieve_page",
  description: "Retrieve a page from Notion",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The ID of the page to retrieve." + commonIdDescription,
      },
    },
    required: ["page_id"],
  },
};

export const updatePagePropertiesTool: Tool = {
  name: "notion_update_page_properties",
  description: "Update properties of a page or an item in a Notion database",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description:
          "The ID of the page or database item to update." +
          commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties to update. These correspond to the columns or fields in the database. For relation property values, provide an array of page IDs: {\"relation\": [{\"id\": \"page-id-1\"}]}",
      },
    },
    required: ["page_id", "properties"],
  },
};

// Users tools
export const listAllUsersTool: Tool = {
  name: "notion_list_all_users",
  description:
    "List all users in the Notion workspace. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  inputSchema: {
    type: "object",
    properties: {
      start_cursor: {
        type: "string",
        description: "Pagination start cursor for listing users",
      },
      page_size: {
        type: "number",
        description: "Number of users to retrieve (max 100)",
      },
    },
  },
};

export const retrieveUserTool: Tool = {
  name: "notion_retrieve_user",
  description:
    "Retrieve a specific user by user_id in Notion. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user to retrieve." + commonIdDescription,
      },
    },
    required: ["user_id"],
  },
};

export const retrieveBotUserTool: Tool = {
  name: "notion_retrieve_bot_user",
  description:
    "Retrieve the bot user associated with the current token in Notion",
  inputSchema: {
    type: "object",
    properties: {
      random_string: {
        type: "string",
        description: "Dummy parameter for no-parameter tools",
      },
    },
    required: ["random_string"],
  },
};

// Databases tools
export const createDatabaseTool: Tool = {
  name: "notion_create_database",
  description: "Create a database in Notion with an initial data source for storing pages",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description: "Parent object of the database (page_id, database_id, or workspace)",
      },
      title: {
        type: "array",
        description:
          "Title of database as it appears in Notion. An array of rich text objects.",
        items: richTextObjectSchema,
      },
      properties: {
        type: "object",
        description:
          "Property schema for the initial data source. Keys are property names and values are property schema objects. For relation properties, use 'data_source_id' (not 'database_id') to specify the target data source.",
      },
      icon: {
        type: "object",
        description: "Icon object for the database (emoji or external/file URL).",
      },
      cover: {
        type: "object",
        description: "Cover image object for the database.",
      },
      initial_data_source: {
        type: "object",
        description: "Configuration for the initial data source created with the database.",
        properties: {
          properties: {
            type: "object",
            description: "Property schema for the data source.",
          },
        },
      },
    },
    required: ["parent", "properties"],
  },
};

export const queryDataSourceTool: Tool = {
  name: "notion_query_data_source",
  description: "Query a data source in Notion to retrieve pages with filtering and sorting",
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description: "The ID of the data source to query." + commonIdDescription,
      },
      filter: {
        type: "object",
        description: "Filter conditions for querying pages in the data source",
      },
      sorts: {
        type: "array",
        description: "Sort conditions for ordering query results",
        items: {
          type: "object",
          properties: {
            property: { type: "string" },
            timestamp: { type: "string" },
            direction: {
              type: "string",
              enum: ["ascending", "descending"],
            },
          },
          required: ["direction"],
        },
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
    },
    required: ["data_source_id"],
  },
};

export const retrieveDatabaseTool: Tool = {
  name: "notion_retrieve_database",
  description: "Retrieve database metadata including list of available data sources",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the database to retrieve." + commonIdDescription,
      },
    },
    required: ["database_id"],
  },
};

export const updateDatabaseTool: Tool = {
  name: "notion_update_database",
  description: "Update database-level properties such as title, icon, cover, parent, and inline status",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description: "The ID of the database to update." + commonIdDescription,
      },
      title: {
        type: "array",
        description:
          "An array of rich text objects representing the database title in the Notion UI.",
        items: richTextObjectSchema,
      },
      icon: {
        type: "object",
        description: "Icon object for the database (emoji or external/file URL).",
      },
      cover: {
        type: "object",
        description: "Cover image object for the database.",
      },
      parent: {
        type: "object",
        description: "Parent object to move the database (page_id, database_id, or workspace).",
      },
      is_inline: {
        type: "boolean",
        description: "Whether the database is displayed inline on a page.",
      },
    },
    required: ["database_id"],
  },
};

export const createDataSourceItemTool: Tool = {
  name: "notion_create_data_source_item",
  description: "Create a new page in a Notion data source",
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to add the page to." + commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties of the new page. These should match the data source schema. For relation property values, provide an array of page IDs: {\"relation\": [{\"id\": \"page-id-1\"}]}",
      },
    },
    required: ["data_source_id", "properties"],
  },
};

export const retrieveDataSourceTool: Tool = {
  name: "notion_retrieve_data_source",
  description: "Retrieve data source schema and metadata",
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to retrieve." + commonIdDescription,
      },
    },
    required: ["data_source_id"],
  },
};

export const updateDataSourceTool: Tool = {
  name: "notion_update_data_source",
  description: "Update data source properties and schema configuration",
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to update." + commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Property schema updates for the data source. Keys are property names and values are property schema objects. For relation properties, use 'data_source_id' (not 'database_id') to specify the target data source.",
      },
      title: {
        type: "array",
        description:
          "An array of rich text objects representing the data source title.",
        items: richTextObjectSchema,
      },
    },
    required: ["data_source_id"],
  },
};

// Comments tools
export const createCommentTool: Tool = {
  name: "notion_create_comment",
  description:
    "Create a comment in Notion. This requires the integration to have 'insert comment' capabilities. You can either specify a page parent or a discussion_id, but not both.",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description:
          "Parent object that specifies the page to comment on. Must include a page_id if used.",
        properties: {
          page_id: {
            type: "string",
            description:
              "The ID of the page to comment on." + commonIdDescription,
          },
        },
      },
      discussion_id: {
        type: "string",
        description:
          "The ID of an existing discussion thread to add a comment to." +
          commonIdDescription,
      },
      rich_text: {
        type: "array",
        description:
          "Array of rich text objects representing the comment content.",
        items: richTextObjectSchema,
      },
    },
    required: ["rich_text"],
  },
};

export const retrieveCommentsTool: Tool = {
  name: "notion_retrieve_comments",
  description:
    "Retrieve a list of unresolved comments from a Notion page or block. Requires the integration to have 'read comment' capabilities.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block or page whose comments you want to retrieve." +
          commonIdDescription,
      },
      start_cursor: {
        type: "string",
        description:
          "If supplied, returns a page of results starting after the cursor.",
      },
      page_size: {
        type: "number",
        description: "Number of comments to retrieve (max 100).",
      },
    },
    required: ["block_id"],
  },
};

// Search tool
export const searchTool: Tool = {
  name: "notion_search",
  description: "Search pages or data sources by title in Notion. Note that databases may contain multiple data sources, which are returned as separate results.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in page or data source titles",
      },
      filter: {
        type: "object",
        description: "Filter results by object type (page or data_source)",
        properties: {
          property: {
            type: "string",
            description: "Must be 'object'",
          },
          value: {
            type: "string",
            description: "Either 'page' or 'data_source'",
          },
        },
      },
      sort: {
        type: "object",
        description: "Sort order of results",
        properties: {
          direction: {
            type: "string",
            enum: ["ascending", "descending"],
          },
          timestamp: {
            type: "string",
            enum: ["last_edited_time"],
          },
        },
      },
      start_cursor: {
        type: "string",
        description: "Pagination start cursor",
      },
      page_size: {
        type: "number",
        description: "Number of results to return (max 100). ",
      },
    },
  },
};

/**
 * Create block-based tools with optionally filtered schemas
 */
export function createBlockBasedTools(enabledBlocks: Set<string>) {
  const filteredBlockSchema = getFilteredBlockSchema(enabledBlocks);

  const descriptionSuffix =
    enabledBlocks.size > 0
      ? ` Enabled block types: ${Array.from(enabledBlocks).join(", ")}. For standard content, use notion_append_markdown.`
      : "";

  return {
    appendBlockChildrenTool: {
      ...appendBlockChildrenTool,
      description: appendBlockChildrenTool.description + descriptionSuffix,
      inputSchema: {
        ...appendBlockChildrenTool.inputSchema,
        properties: {
          ...appendBlockChildrenTool.inputSchema.properties,
          children: {
            type: "array",
            description:
              enabledBlocks.size > 0
                ? `Array of block objects. Supported types: ${Array.from(enabledBlocks).join(", ")}`
                : "Array of block objects to append. Each block must follow the Notion block schema.",
            items: filteredBlockSchema,
          },
        },
      },
    },

    updateBlockTool: {
      ...updateBlockTool,
      description: updateBlockTool.description + descriptionSuffix,
      inputSchema: {
        ...updateBlockTool.inputSchema,
        properties: {
          ...updateBlockTool.inputSchema.properties,
          block: {
            type: "object",
            description:
              enabledBlocks.size > 0
                ? `Updated block content. Supported types: ${Array.from(enabledBlocks).join(", ")}`
                : "The updated content for the block. Must match the block's type schema.",
          },
        },
      },
    },
  };
}
