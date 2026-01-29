/**
 * Markdown tool schema definitions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { commonIdDescription, formatParameter } from "./common.js";

export const appendMarkdownTool: Tool = {
  name: "notion_append_markdown",
  description:
    "Append Markdown content to a Notion block. Supports GitHub Flavored Markdown including paragraphs, headings, lists, tables, code blocks, equations, images, and callouts. For complex block types like toggles or columns, use notion_append_block_children.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the parent block." + commonIdDescription,
      },
      markdown: {
        type: "string",
        description:
          "Markdown content to append. Supports GFM syntax, tables, math equations (KaTeX), code blocks with language highlighting, and callouts (use > [!NOTE] syntax or > 📘 emoji prefix).",
      },
      format: formatParameter,
    },
    required: ["block_id", "markdown"],
  },
};

export const createPageFromMarkdownTool: Tool = {
  name: "notion_create_page_from_markdown",
  description:
    "Create a new Notion page with Markdown content. Ideal for creating pages with rich formatted content using simple Markdown syntax.",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description:
          "Parent object (page_id, database_id, or workspace). Use page_id for sub-pages, database_id for database items.",
      },
      title: {
        type: "string",
        description: "The page title (plain text).",
      },
      markdown: {
        type: "string",
        description:
          "Page content in Markdown format. Supports all GFM features.",
      },
      properties: {
        type: "object",
        description:
          'Database properties if parent is a database. For relation properties, provide an array of page IDs: {"relation": [{"id": "page-id"}]}',
      },
      icon: {
        type: "object",
        description: "Page icon (emoji or external/file URL).",
      },
      format: formatParameter,
    },
    required: ["parent", "markdown"],
  },
};
