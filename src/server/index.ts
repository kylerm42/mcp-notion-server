/**
 * MCP server setup and request handling
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { markdownToBlocks, markdownToRichText } from "@tryfabric/martian";
import { NotionClientWrapper } from "../client/index.js";
import { filterTools } from "../utils/index.js";
import * as schemas from "../types/schemas.js";
import * as markdownSchemas from "../types/markdown-schemas.js";
import * as args from "../types/args.js";
import { transformResponse } from "../formats/transformer.js";
import { logger } from "../logger.js";

/**
 * Filter JSON response to include only specified columns in page properties
 * @param response Notion API list response
 * @param columns Array of property names to include
 * @returns Filtered response with only specified properties
 */
function filterJsonResponseColumns(response: any, columns: string[]): any {
  if (!response.results || !Array.isArray(response.results)) {
    return response;
  }

  const columnSet = new Set(columns);
  
  return {
    ...response,
    results: response.results.map((page: any) => {
      if (!page.properties || typeof page.properties !== "object") {
        return page;
      }

      const filteredProperties: Record<string, any> = {};
      for (const [propName, propValue] of Object.entries(page.properties)) {
        if (columnSet.has(propName)) {
          filteredProperties[propName] = propValue;
        }
      }

      return {
        ...page,
        properties: filteredProperties,
      };
    }),
  };
}

/**
 * Start the MCP server
 */
export async function startServer(
  notionToken: string,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean,
  enabledBlocksSet: Set<string> = new Set()
) {
  logger.debug("Creating MCP Server instance");
  const serverStartTime = Date.now();
  
  const server = new Server(
    {
      name: "Notion MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  logger.debug(`MCP Server instance created (${Date.now() - serverStartTime}ms)`);

  logger.debug("Initializing Notion API client");
  const clientStartTime = Date.now();
  const notionClient = new NotionClientWrapper(notionToken);
  logger.debug(`Notion API client initialized (${Date.now() - clientStartTime}ms)`);

  logger.debug("Registering CallTool handler");
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      logger.debug(`Received CallToolRequest: ${request.params.name}`);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        let response;

        switch (request.params.name) {
          case "append_block_children": {
            const args = request.params
              .arguments as unknown as args.AppendBlockChildrenArgs;
            if (!args.block_id || !args.children) {
              throw new Error(
                "Missing required arguments: block_id and children"
              );
            }
            response = await notionClient.appendBlockChildren(
              args.block_id,
              args.children
            );
            break;
          }

          case "retrieve_block": {
            const args = request.params
              .arguments as unknown as args.RetrieveBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveBlock(args.block_id);
            break;
          }

          case "retrieve_block_children": {
            const args = request.params
              .arguments as unknown as args.RetrieveBlockChildrenArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveBlockChildren(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "delete_block": {
            const args = request.params
              .arguments as unknown as args.DeleteBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.deleteBlock(args.block_id);
            break;
          }

          case "update_block": {
            const args = request.params
              .arguments as unknown as args.UpdateBlockArgs;
            if (!args.block_id || !args.block) {
              throw new Error("Missing required arguments: block_id and block");
            }
            response = await notionClient.updateBlock(
              args.block_id,
              args.block
            );
            break;
          }

          case "retrieve_page": {
            const args = request.params
              .arguments as unknown as args.RetrievePageArgs;
            if (!args.page_id) {
              throw new Error("Missing required argument: page_id");
            }
            response = await notionClient.retrievePage(args.page_id);
            break;
          }

          case "update_page_properties": {
            const args = request.params
              .arguments as unknown as args.UpdatePagePropertiesArgs;
            if (!args.page_id || !args.properties) {
              throw new Error(
                "Missing required arguments: page_id and properties"
              );
            }
            response = await notionClient.updatePageProperties(
              args.page_id,
              args.properties
            );
            break;
          }

          case "list_all_users": {
            const args = request.params
              .arguments as unknown as args.ListAllUsersArgs;
            response = await notionClient.listAllUsers(
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "retrieve_user": {
            const args = request.params
              .arguments as unknown as args.RetrieveUserArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            response = await notionClient.retrieveUser(args.user_id);
            break;
          }

          case "retrieve_bot_user": {
            response = await notionClient.retrieveBotUser();
            break;
          }

          case "query_data_source": {
            const queryArgs = request.params
              .arguments as unknown as args.QueryDataSourceArgs;
            if (!queryArgs.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            
            // Apply default response_format
            const responseFormat = queryArgs.response_format || "table";
            
            // Validate response_format
            if (!["json", "summary", "table"].includes(responseFormat)) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      error: "Invalid response_format",
                      message: `response_format must be one of: "json", "summary", "table". Got: "${responseFormat}"`,
                    }, null, 2),
                  },
                ],
                isError: true,
              };
            }
            
            // Query the API
            const result = await notionClient.queryDataSource(
              queryArgs.data_source_id,
              queryArgs.filter,
              queryArgs.sorts,
              queryArgs.start_cursor,
              queryArgs.page_size
            );
            
            // Transform response based on format
            if (responseFormat !== "json") {
              const transformed = await transformResponse(
                result,
                queryArgs.data_source_id,
                responseFormat as "summary" | "table",
                notionClient,
                queryArgs.columns
              );
              
              // Return transformed response as text
              return {
                content: [
                  {
                    type: "text",
                    text: responseFormat === "table" 
                      ? transformed 
                      : JSON.stringify(transformed, null, 2)
                  },
                ],
              };
            }
            
            // JSON format: apply column filtering if specified
            if (queryArgs.columns && queryArgs.columns.length > 0) {
              const filteredResult = filterJsonResponseColumns(result, queryArgs.columns);
              response = filteredResult;
            } else {
              response = result;
            }
            break;
          }

          case "create_database": {
            const args = request.params
              .arguments as unknown as args.CreateDatabaseArgs;
            response = await notionClient.createDatabase(
              args.parent,
              args.properties,
              args.title
            );
            break;
          }

          case "retrieve_database": {
            const args = request.params
              .arguments as unknown as args.RetrieveDatabaseArgs;
            response = await notionClient.retrieveDatabase(args.database_id);
            break;
          }

          case "update_database": {
            const args = request.params
              .arguments as unknown as args.UpdateDatabaseArgs;
            response = await notionClient.updateDatabase(
              args.database_id,
              args.title,
              args.icon,
              args.cover,
              args.parent,
              args.is_inline
            );
            break;
          }

          case "create_data_source_item": {
            const args = request.params
              .arguments as unknown as args.CreateDataSourceItemArgs;
            response = await notionClient.createDataSourceItem(
              args.data_source_id,
              args.properties
            );
            break;
          }

          case "retrieve_data_source": {
            const args = request.params
              .arguments as unknown as args.RetrieveDataSourceArgs;
            if (!args.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            response = await notionClient.retrieveDataSource(args.data_source_id);
            break;
          }

          case "update_data_source": {
            const args = request.params
              .arguments as unknown as args.UpdateDataSourceArgs;
            if (!args.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            response = await notionClient.updateDataSource(
              args.data_source_id,
              args.properties,
              args.title
            );
            break;
          }

          case "create_comment": {
            const args = request.params
              .arguments as unknown as args.CreateCommentArgs;

            if (!args.parent && !args.discussion_id) {
              throw new Error(
                "Either parent.page_id or discussion_id must be provided"
              );
            }

            response = await notionClient.createComment(
              args.parent,
              args.discussion_id,
              args.rich_text
            );
            break;
          }

          case "retrieve_comments": {
            const args = request.params
              .arguments as unknown as args.RetrieveCommentsArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveComments(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "search": {
            const args = request.params.arguments as unknown as args.SearchArgs;
            response = await notionClient.search(
              args.query,
              args.filter,
              args.sort,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "append_markdown": {
            const args = request.params.arguments as {
              block_id: string;
              markdown: string;
              format?: string;
            };

            if (!args.block_id || !args.markdown) {
              throw new Error(
                "Missing required arguments: block_id and markdown"
              );
            }

            // Convert Markdown to Notion blocks with error handling
            try {
              const blocks = markdownToBlocks(args.markdown, {
                strictImageUrls: true,
                notionLimits: { truncate: true },
              });

              response = await notionClient.appendBlockChildren(
                args.block_id,
                blocks
              );
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      error: `Failed to convert Markdown: ${error instanceof Error ? error.message : String(error)}`,
                    }),
                  },
                ],
                isError: true,
              };
            }
            break;
          }

          case "create_page_from_markdown": {
            const args = request.params.arguments as {
              parent: {
                page_id?: string;
                database_id?: string;
                workspace?: boolean;
              };
              title?: string;
              markdown: string;
              properties?: Record<string, any>;
              icon?: { emoji?: string; external?: { url: string } };
              format?: string;
            };

            if (!args.parent || !args.markdown) {
              throw new Error("Missing required arguments: parent and markdown");
            }

            // Convert Markdown to blocks with error handling
            try {
              const children = markdownToBlocks(args.markdown, {
                strictImageUrls: true,
                notionLimits: { truncate: true },
              });

              // Build page properties
              const pageProperties = args.properties || {};
              if (args.title && !pageProperties.title) {
                // Convert plain text title to rich text format for Notion API
                pageProperties.title = [
                  { type: "text", text: { content: args.title } },
                ];
              }

              response = await notionClient.createPage({
                parent: args.parent,
                properties: pageProperties,
                children,
                icon: args.icon,
              });
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      error: `Failed to convert Markdown: ${error instanceof Error ? error.message : String(error)}`,
                    }),
                  },
                ],
                isError: true,
              };
            }
            break;
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        // Check if response contains block content that benefits from Markdown conversion
        const requestedFormat =
          (request.params.arguments as any)?.format || "markdown";

        // Only convert to markdown if:
        // 1. Markdown conversion is enabled via environment variable
        // 2. The requested format is markdown
        // 3. The response is block content (single block or list of blocks)
        const isBlockContent =
          response.object === "block" ||
          (response.object === "list" &&
            response.results &&
            response.results.length > 0 &&
            response.results[0].object === "block");

        if (
          enableMarkdownConversion &&
          requestedFormat === "markdown" &&
          isBlockContent
        ) {
          const markdown = await notionClient.toMarkdown(response);
          return {
            content: [{ type: "text", text: markdown }],
          };
        } else {
          // Return JSON for all metadata responses and non-block content
          return {
            content: [
              { type: "text", text: JSON.stringify(response, null, 2) },
            ],
          };
        }
      } catch (error) {
        logger.error(`Error executing tool ${request.params.name}: ${error instanceof Error ? error.message : String(error)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    }
  );
  logger.debug("CallToolRequest handler registered");

  logger.debug("Registering ListTools handler");
  const listToolsStartTime = Date.now();
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("ListTools request received, building tool schemas");
    const schemaStartTime = Date.now();
    
    // Create tools with filtered block schemas
    const blockTools = schemas.createBlockBasedTools(enabledBlocksSet);
    logger.debug(`Block-based tools created (${Date.now() - schemaStartTime}ms)`);

    const allTools = [
      blockTools.appendBlockChildrenTool,
      schemas.retrieveBlockTool,
      schemas.retrieveBlockChildrenTool,
      schemas.deleteBlockTool,
      blockTools.updateBlockTool,
      schemas.retrievePageTool,
      schemas.updatePagePropertiesTool,
      schemas.listAllUsersTool,
      schemas.retrieveUserTool,
      schemas.retrieveBotUserTool,
      schemas.createDatabaseTool,
      schemas.queryDataSourceTool,
      schemas.retrieveDatabaseTool,
      schemas.updateDatabaseTool,
      schemas.retrieveDataSourceTool,
      schemas.updateDataSourceTool,
      schemas.createDataSourceItemTool,
      schemas.createCommentTool,
      schemas.retrieveCommentsTool,
      schemas.searchTool,
      markdownSchemas.appendMarkdownTool,
      markdownSchemas.createPageFromMarkdownTool,
    ];
    
    const filteredTools = filterTools(allTools, enabledToolsSet);
    logger.debug(`Tools filtered: ${filteredTools.length}/${allTools.length} tools enabled (${Date.now() - schemaStartTime}ms total)`);
    
    return {
      tools: filteredTools,
    };
  });
  logger.debug(`ListTools handler registered (${Date.now() - listToolsStartTime}ms)`);

  logger.debug("Creating stdio transport");
  const transportStartTime = Date.now();
  const transport = new StdioServerTransport();
  logger.debug(`Stdio transport created (${Date.now() - transportStartTime}ms)`);
  
  logger.debug("Connecting server to transport");
  const connectStartTime = Date.now();
  await server.connect(transport);
  logger.debug(`Server connected to transport (${Date.now() - connectStartTime}ms)`);
}
