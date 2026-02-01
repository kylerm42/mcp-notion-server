/**
 * Unit tests for property extraction utilities
 */

import { describe, test, expect } from "vitest";
import {
  extractRichText,
  extractPropertyValue,
  extractPageTitle,
} from "./property-extractor.js";
import { PageProperty, RichTextItemResponse } from "../types/index.js";

describe("extractRichText", () => {
  test("should extract plain text from simple rich text array", () => {
    const richText: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Hello World" },
        plain_text: "Hello World",
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
      },
    ];
    expect(extractRichText(richText)).toBe("Hello World");
  });

  test("should apply bold annotation", () => {
    const richText: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Bold Text" },
        plain_text: "Bold Text",
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
      },
    ];
    expect(extractRichText(richText)).toBe("**Bold Text**");
  });

  test("should apply multiple annotations", () => {
    const richText: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Text" },
        plain_text: "Text",
        annotations: {
          bold: true,
          italic: true,
          strikethrough: false,
          underline: false,
          code: true,
          color: "default",
        },
      },
    ];
    expect(extractRichText(richText)).toBe("***`Text`***");
  });

  test("should handle links", () => {
    const richText: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Click here", link: { url: "https://example.com" } },
        plain_text: "Click here",
        href: "https://example.com",
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
      },
    ];
    expect(extractRichText(richText)).toBe("[Click here](https://example.com)");
  });

  test("should handle empty array", () => {
    expect(extractRichText([])).toBe("");
  });

  test("should handle null input", () => {
    // @ts-ignore - intentionally testing with null
    expect(extractRichText(null)).toBe("");
  });

  test("should concatenate multiple rich text items", () => {
    const richText: RichTextItemResponse[] = [
      {
        type: "text",
        text: { content: "Hello " },
        plain_text: "Hello ",
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
      },
      {
        type: "text",
        text: { content: "World" },
        plain_text: "World",
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
      },
    ];
    expect(extractRichText(richText)).toBe("Hello **World**");
  });
});

describe("extractPropertyValue", () => {
  test("should extract title property", () => {
    const property: PageProperty = {
      id: "title",
      type: "title",
      title: [
        {
          type: "text",
          text: { content: "Page Title" },
          plain_text: "Page Title",
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
        },
      ],
    };
    expect(extractPropertyValue(property)).toBe("Page Title");
  });

  test("should extract rich_text property", () => {
    const property: PageProperty = {
      id: "text",
      type: "rich_text",
      rich_text: [
        {
          type: "text",
          text: { content: "Some text" },
          plain_text: "Some text",
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
        },
      ],
    };
    expect(extractPropertyValue(property)).toBe("Some text");
  });

  test("should extract number property", () => {
    const property: PageProperty = {
      id: "num",
      type: "number",
      number: 42,
    };
    expect(extractPropertyValue(property)).toBe("42");
  });

  test("should extract select property", () => {
    const property: PageProperty = {
      id: "select",
      type: "select",
      select: { id: "1", name: "Option A", color: "blue" },
    };
    expect(extractPropertyValue(property)).toBe("Option A");
  });

  test("should extract multi_select property", () => {
    const property: PageProperty = {
      id: "multi",
      type: "multi_select",
      multi_select: [
        { id: "1", name: "Tag1", color: "blue" },
        { id: "2", name: "Tag2", color: "green" },
      ],
    };
    expect(extractPropertyValue(property)).toBe("Tag1, Tag2");
  });

  test("should extract date property with range", () => {
    const property: PageProperty = {
      id: "date",
      type: "date",
      date: { start: "2025-02-01", end: "2025-02-07" },
    };
    expect(extractPropertyValue(property)).toBe("2025-02-01 → 2025-02-07");
  });

  test("should extract date property without range", () => {
    const property: PageProperty = {
      id: "date",
      type: "date",
      date: { start: "2025-02-01" },
    };
    expect(extractPropertyValue(property)).toBe("2025-02-01");
  });

  test("should extract people property", () => {
    const property: PageProperty = {
      id: "people",
      type: "people",
      people: [
        { object: "user", id: "user1", name: "Alice" },
        { object: "user", id: "user2", name: "Bob" },
      ],
    };
    expect(extractPropertyValue(property)).toBe("Alice, Bob");
  });

  test("should extract files property", () => {
    const property: PageProperty = {
      id: "files",
      type: "files",
      files: [
        {
          name: "document.pdf",
          file: { url: "https://example.com/doc.pdf", expiry_time: "" },
        },
      ],
    };
    expect(extractPropertyValue(property)).toBe("[document.pdf](https://example.com/doc.pdf)");
  });

  test("should extract checkbox property (checked)", () => {
    const property: PageProperty = {
      id: "check",
      type: "checkbox",
      checkbox: true,
    };
    expect(extractPropertyValue(property)).toBe("✓");
  });

  test("should extract checkbox property (unchecked)", () => {
    const property: PageProperty = {
      id: "check",
      type: "checkbox",
      checkbox: false,
    };
    expect(extractPropertyValue(property)).toBe("✗");
  });

  test("should extract url property", () => {
    const property: PageProperty = {
      id: "url",
      type: "url",
      url: "https://example.com",
    };
    expect(extractPropertyValue(property)).toBe("https://example.com");
  });

  test("should extract email property", () => {
    const property: PageProperty = {
      id: "email",
      type: "email",
      email: "user@example.com",
    };
    expect(extractPropertyValue(property)).toBe("user@example.com");
  });

  test("should extract phone_number property", () => {
    const property: PageProperty = {
      id: "phone",
      type: "phone_number",
      phone_number: "+1-555-1234",
    };
    expect(extractPropertyValue(property)).toBe("+1-555-1234");
  });

  test("should extract formula property (string)", () => {
    const property: PageProperty = {
      id: "formula",
      type: "formula",
      formula: { type: "string", string: "Result" },
    };
    expect(extractPropertyValue(property)).toBe("Result");
  });

  test("should extract formula property (number)", () => {
    const property: PageProperty = {
      id: "formula",
      type: "formula",
      formula: { type: "number", number: 100 },
    };
    expect(extractPropertyValue(property)).toBe("100");
  });

  test("should extract status property", () => {
    const property: PageProperty = {
      id: "status",
      type: "status",
      status: { id: "1", name: "In Progress", color: "yellow" },
    };
    expect(extractPropertyValue(property)).toBe("In Progress");
  });

  test("should extract relation property", () => {
    const property: PageProperty = {
      id: "relation",
      type: "relation",
      relation: [{ id: "page-id-1" }, { id: "page-id-2" }],
    };
    expect(extractPropertyValue(property)).toBe("`page-id-1`, `page-id-2`");
  });

  test("should extract rollup property (number)", () => {
    const property: PageProperty = {
      id: "rollup",
      type: "rollup",
      rollup: { type: "number", number: 5, function: "sum" },
    };
    expect(extractPropertyValue(property)).toBe("5");
  });

  test("should extract rollup property (array)", () => {
    const property: PageProperty = {
      id: "rollup",
      type: "rollup",
      rollup: { type: "array", array: [1, 2, 3], function: "show_original" },
    };
    expect(extractPropertyValue(property)).toBe(JSON.stringify([1, 2, 3]));
  });

  test("should extract created_by property", () => {
    const property: PageProperty = {
      id: "created_by",
      type: "created_by",
      created_by: { object: "user", id: "user1", name: "Creator" },
    };
    expect(extractPropertyValue(property)).toBe("Creator");
  });

  test("should extract created_time property", () => {
    const property: PageProperty = {
      id: "created_time",
      type: "created_time",
      created_time: "2025-02-01T12:00:00.000Z",
    };
    expect(extractPropertyValue(property)).toBe("2025-02-01T12:00:00.000Z");
  });

  test("should extract last_edited_by property", () => {
    const property: PageProperty = {
      id: "last_edited_by",
      type: "last_edited_by",
      last_edited_by: { object: "user", id: "user2", name: "Editor" },
    };
    expect(extractPropertyValue(property)).toBe("Editor");
  });

  test("should extract last_edited_time property", () => {
    const property: PageProperty = {
      id: "last_edited_time",
      type: "last_edited_time",
      last_edited_time: "2025-02-01T15:00:00.000Z",
    };
    expect(extractPropertyValue(property)).toBe("2025-02-01T15:00:00.000Z");
  });

  test("should handle empty property values", () => {
    const property: PageProperty = {
      id: "empty",
      type: "select",
      select: null,
    };
    expect(extractPropertyValue(property)).toBe("");
  });

  test("should handle null property", () => {
    // @ts-ignore - intentionally testing with null
    expect(extractPropertyValue(null)).toBe("");
  });

  test("should handle unsupported property type", () => {
    const property: PageProperty = {
      id: "unknown",
      type: "unsupported_type",
    };
    expect(extractPropertyValue(property)).toBe("(Unsupported property type)");
  });
});

describe("extractPageTitle", () => {
  test("should extract title from properties", () => {
    const properties: Record<string, PageProperty> = {
      Title: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: { content: "My Page Title" },
            plain_text: "My Page Title",
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
          },
        ],
      },
      Status: {
        id: "status",
        type: "select",
        select: { id: "1", name: "Active", color: "green" },
      },
    };
    expect(extractPageTitle(properties)).toBe("My Page Title");
  });

  test("should return empty string when no title property exists", () => {
    const properties: Record<string, PageProperty> = {
      Status: {
        id: "status",
        type: "select",
        select: { id: "1", name: "Active", color: "green" },
      },
    };
    expect(extractPageTitle(properties)).toBe("");
  });

  test("should handle empty properties object", () => {
    expect(extractPageTitle({})).toBe("");
  });

  test("should handle null properties", () => {
    // @ts-ignore - intentionally testing with null
    expect(extractPageTitle(null)).toBe("");
  });

  test("should extract title with formatted text", () => {
    const properties: Record<string, PageProperty> = {
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: { content: "Bold" },
            plain_text: "Bold",
            annotations: {
              bold: true,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
          },
          {
            type: "text",
            text: { content: " Title" },
            plain_text: " Title",
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
          },
        ],
      },
    };
    expect(extractPageTitle(properties)).toBe("**Bold** Title");
  });
});
