/**
 * Property value extraction utilities
 * 
 * Reusable functions for extracting and formatting Notion property values
 * across different output contexts (summary, table, markdown).
 * 
 * Supports all 19 Notion property types with consistent formatting:
 * - Text properties: title, rich_text
 * - Selection properties: select, multi_select, status
 * - Date/time properties: date, created_time, last_edited_time
 * - People properties: people, created_by, last_edited_by
 * - Relation properties: relation, rollup
 * - Other: checkbox, url, email, phone_number, number, formula, files
 */

import { PageProperty, RichTextItemResponse } from "../types/index.js";

/**
 * Extracts plain text from a Notion rich text array
 */
export function extractRichText(richTextArray: RichTextItemResponse[]): string {
  if (!richTextArray || !Array.isArray(richTextArray)) return "";

  return richTextArray
    .map((item) => {
      let text = item.plain_text || "";

      // Process annotations
      if (item.annotations) {
        const { bold, italic, strikethrough, code } = item.annotations;

        if (code) text = `\`${text}\``;
        if (bold) text = `**${text}**`;
        if (italic) text = `*${text}*`;
        if (strikethrough) text = `~~${text}~~`;
      }

      // Process links
      if (item.href) {
        text = `[${text}](${item.href})`;
      }

      return text;
    })
    .join("");
}

/**
 * Extracts a property value from a page property
 * @param property The page property object
 * @returns String representation of the property value
 */
export function extractPropertyValue(property: PageProperty): string {
  if (!property) return "";

  // Extract value based on property type
  switch (property.type) {
    case "title":
      return extractRichText(property.title || []);
    case "rich_text":
      return extractRichText(property.rich_text || []);
    case "number":
      return property.number?.toString() || "";
    case "select":
      return property.select?.name || "";
    case "multi_select":
      return (property.multi_select || [])
        .map((item: any) => item.name)
        .join(", ");
    case "date":
      const start = property.date?.start || "";
      const end = property.date?.end ? ` → ${property.date.end}` : "";
      return start + end;
    case "people":
      return (property.people || [])
        .map((person: any) => person.name || person.id)
        .join(", ");
    case "files":
      return (property.files || [])
        .map(
          (file: any) =>
            `[${file.name || "Attachment"}](${
              file.file?.url || file.external?.url || "#"
            })`
        )
        .join(", ");
    case "checkbox":
      return property.checkbox ? "✓" : "✗";
    case "url":
      return property.url || "";
    case "email":
      return property.email || "";
    case "phone_number":
      return property.phone_number || "";
    case "formula":
      return (
        property.formula?.string ||
        property.formula?.number?.toString() ||
        property.formula?.boolean?.toString() ||
        ""
      );
    case "status":
      return property.status?.name || "";
    case "relation":
      return (property.relation || [])
        .map((relation: any) => `\`${relation.id}\``)
        .join(", ");
    case "rollup":
      if (property.rollup?.type === "array") {
        return JSON.stringify(property.rollup.array || []);
      } else {
        return (
          property.rollup?.number?.toString() ||
          property.rollup?.date?.start ||
          property.rollup?.string ||
          ""
        );
      }
    case "created_by":
      return property.created_by?.name || property.created_by?.id || "";
    case "created_time":
      return property.created_time || "";
    case "last_edited_by":
      return property.last_edited_by?.name || property.last_edited_by?.id || "";
    case "last_edited_time":
      return property.last_edited_time || "";
    default:
      return "(Unsupported property type)";
  }
}

/**
 * Extracts page title from page properties
 * @param properties Page properties object
 * @returns Page title or empty string
 */
export function extractPageTitle(properties: Record<string, PageProperty>): string {
  if (!properties) return "";

  // Look for the title property
  for (const [_, prop] of Object.entries(properties)) {
    const property = prop as PageProperty;
    if (property.type === "title" && Array.isArray(property.title)) {
      return extractRichText(property.title);
    }
  }

  return "";
}
