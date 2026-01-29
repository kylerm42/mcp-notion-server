# Code Review: Markdown Tools with Filtered Block Schemas
---
reviewer: AP-5
date: 2026-01-29
status: approved_with_changes
---

## Executive Summary
Implementation is functionally complete and well-tested (90/90 tests passing). Core architecture is sound, but several critical issues exist: missing validation for `after` parameter, `@ts-ignore` overuse in tests, and incomplete handling of the `format` parameter. Additionally, the `after` parameter is advertised in the schema but not implemented.

## Critical Issues 🔴

### src/server/index.ts:292-318 - `after` parameter advertised but not implemented
**Why**: Tool schema advertises support for `after` parameter (line 24-29 in markdown-schemas.ts), but handler at line 313-316 doesn't pass it to `appendBlockChildren()`. This is a spec violation - users will expect functionality that doesn't work.

**Fix**: Either (1) implement `after` parameter support in `NotionClientWrapper.appendBlockChildren()` and pass it through in handler, or (2) remove `after` from the tool schema until implemented.

**Severity**: Spec violation - advertised feature doesn't work.

---

### src/server/index.ts:366-384 - Inconsistent format parameter handling
**Why**: Format parameter logic only checks `enableMarkdownConversion` flag but doesn't validate the `format` value from arguments. Line 368 reads format but line 373 checks wrong condition - should respect user's format choice when markdown conversion is enabled, not override it.

**Fix**: 
```typescript
const requestedFormat = (request.params.arguments as any)?.format || "markdown";
if (enableMarkdownConversion && requestedFormat === "markdown") {
  // convert
} else {
  // return JSON
}
```
This already appears correct on review, but the comment on line 370-372 is misleading - it suggests both conditions must be met, which is correct behavior. Issue is documentation clarity.

**Severity**: Logic works but comments are confusing.

---

### src/server/index.ts:313 & 315 - Missing error handling for martian conversion
**Why**: `markdownToBlocks()` can throw errors or return unexpected structures for malformed Markdown. No try-catch around lines 307-310 or 339-342. If martian fails, the error propagates as unhandled.

**Fix**: Wrap martian calls in try-catch blocks within each case handler:
```typescript
try {
  const blocks = markdownToBlocks(args.markdown, {
    strictImageUrls: true,
    notionLimits: { truncate: true },
  });
  response = await notionClient.appendBlockChildren(args.block_id, blocks);
} catch (error) {
  throw new Error(`Failed to convert Markdown: ${error instanceof Error ? error.message : String(error)}`);
}
```

**Severity**: Unhandled errors could crash server or return cryptic error messages.

---

## Major Issues 🟡

### src/markdown-tools.test.ts:16,24,32,40,50,52,68,77,86,94,104,138,140,149 - Excessive @ts-ignore usage
**Why**: 14 instances of `@ts-ignore` to access block properties (e.g., `blocks[0].paragraph`). This suppresses type safety and hides potential runtime errors. TypeScript is warning that these properties might not exist on the martian return type.

**Fix**: Create proper type guards or assertions:
```typescript
const blocks = markdownToBlocks("Hello world") as Array<{ type: string; [key: string]: any }>;
expect(blocks[0]).toHaveProperty('paragraph');
```
Or import proper types from `@tryfabric/martian` if available.

**Severity**: Tests work but suppress type safety warnings that could indicate real issues.

---

### src/types/common.ts:564-594 - Type casting breaks strict type safety
**Why**: Lines 582 and 591 use `as any` to bypass TypeScript's type checking for the filtered properties object. This defeats the purpose of TypeScript's strict mode.

**Fix**: Define proper return type or use type assertions that maintain some type safety:
```typescript
export function getFilteredBlockSchema(
  enabledBlocks: Set<string>
): { type: string; description: string; properties: Record<string, any>; required: string[] } {
  // ... implementation
  return {
    type: blockObjectSchema.type,
    description: `A Notion block object. Only these block types are enabled: ${Array.from(enabledBlocks).join(", ")}. Use notion_append_markdown for standard content.`,
    properties: filteredProperties,
    required: blockObjectSchema.required,
  };
}
```

**Severity**: Reduces type safety in a function used throughout the tool registration system.

---

### src/server/index.ts:293-298 - Inline type definitions in handler
**Why**: Lines 293-298 define argument types inline instead of using the args interface pattern used elsewhere (e.g., line 55-56 uses `args.AppendBlockChildrenArgs`). Inconsistent with project conventions from AGENTS.md.

**Fix**: Add interface definitions to `src/types/args.ts`:
```typescript
export interface AppendMarkdownArgs {
  block_id: string;
  markdown: string;
  after?: string;
  format?: string;
}

export interface CreatePageFromMarkdownArgs {
  parent: { page_id?: string; database_id?: string; workspace?: boolean };
  title?: string;
  markdown: string;
  properties?: Record<string, any>;
  icon?: { emoji?: string; external?: { url: string } };
  format?: string;
}
```

**Severity**: Code smell - inconsistent with established patterns, harder to maintain.

---

### src/index.ts:18-20 - Environment variable documentation incomplete
**Why**: JSDoc comment documents `NOTION_ENABLED_BLOCKS` but doesn't explain the Markdown tools themselves. Users won't know these tools exist without reading the full README.

**Fix**: Add comprehensive comment:
```typescript
 * - NOTION_ENABLED_BLOCKS: Optional. Comma-separated list of block types to enable in raw JSON tools.
 *   Example: "toggle,column,column_list,bookmark,embed"
 *   If empty, all block types are available. Use with Markdown tools for optimal token efficiency.
 *   Note: New Markdown tools (notion_append_markdown, notion_create_page_from_markdown) provide
 *   a simpler interface for common content blocks and don't require this configuration.
```

**Severity**: Usability issue - feature is hidden without documentation.

---

## Minor Suggestions 🟢

### src/types/markdown-schemas.ts:22 - Inconsistent terminology
Line 22 mentions "callouts" but martian actually produces "quote" blocks (as discovered in test implementation notes). Schema description should match actual behavior.

**Fix**: Update description to clarify: "and quotes (blockquotes convert to quote blocks, not callouts)"

---

### src/client/index.ts:432-445 - Missing JSDoc for new createPage method
The `createPage()` method added in lines 432-445 has minimal documentation. Should document the parent types, properties structure, and relation to the new Markdown tools.

**Fix**: Add comprehensive JSDoc:
```typescript
/**
 * Create a new page in Notion with optional content blocks
 * 
 * @param params.parent - Parent location: page_id for subpages, database_id for database items, workspace:true for top-level
 * @param params.properties - Page properties. For database pages, must match database schema.
 * @param params.children - Optional array of block objects for page content
 * @param params.icon - Optional emoji or external URL icon
 * @param params.cover - Optional cover image
 * @returns Created page object
 * @see https://developers.notion.com/reference/post-page
 */
```

---

### src/server.test.ts:9-17 - Mock could be more specific
Mock implementation returns generic functions but doesn't validate call signatures. Tests pass even if arguments are wrong.

**Suggestion**: Use typed mocks:
```typescript
vi.mock("./client/index.js", () => {
  return {
    NotionClientWrapper: vi.fn().mockImplementation(() => ({
      appendBlockChildren: vi.fn((blockId: string, children: any[]) => Promise.resolve({...})),
      createPage: vi.fn((params: any) => Promise.resolve({...})),
    })),
  };
});
```

---

### src/types/schemas.ts:550-596 - Function could return typed tools
`createBlockBasedTools()` returns an object with two tool properties but has no explicit return type. Makes it harder to refactor.

**Suggestion**: Define return type:
```typescript
export function createBlockBasedTools(enabledBlocks: Set<string>): {
  appendBlockChildrenTool: Tool;
  updateBlockTool: Tool;
} {
  // ... implementation
}
```

---

### package.json:32 - martian dependency version unpinned
Line 33 uses `^1.2.4` which allows minor version updates. For a conversion library, this could introduce breaking changes in output format.

**Suggestion**: Pin exact version or use tilde for patches only: `~1.2.4`

---

### src/markdown-tools.test.ts:261-282 - Options tests don't verify behavior
Tests for `strictImageUrls` and `notionLimits` only check that they don't throw errors, not that they actually affect output.

**Suggestion**: Add assertions that verify option effects:
```typescript
test("should handle strictImageUrls option", () => {
  const markdown = "![alt text](not-a-valid-url)";
  const blocks = markdownToBlocks(markdown, { strictImageUrls: true });
  
  // Should convert invalid image to text/paragraph, not image block
  expect(blocks[0].type).not.toBe("image");
  expect(blocks[0].type).toBe("paragraph"); // or whatever fallback martian uses
});
```

---

### Spec line 752 - Implementation note mentions missing `after` parameter
Line 752 notes: "'after' parameter in append_markdown schema exists but not implemented in underlying appendBlockChildren method". This is now a critical issue (see above) rather than just a note.

---

## Verification Checklist
- [x] Spec compliance verified - MOSTLY (critical issue: `after` param not implemented)
- [x] Security checks passed - No XSS risks found (martian handles sanitization)
- [x] Tests passing - 90/90 tests pass
- [x] Documentation updated - Phase 5 (documentation) still marked incomplete in spec
- [x] Architectural integrity maintained - Clean separation, backward compatible
- [x] Import conventions followed - All imports use `.js` extensions correctly
- [x] TypeScript conventions followed - Mostly (see type safety issues above)
- [x] Error handling adequate - Needs improvement around martian calls

## Security Assessment ✅

**Markdown Injection Risk**: MITIGATED
- Martian library handles conversion and produces structured Notion blocks
- No direct HTML rendering or script execution risk
- Notion's API validates all block structures server-side

**Environment Variable Validation**: ADEQUATE
- `NOTION_ENABLED_BLOCKS` parsing is safe (line 41-43 in index.ts)
- Uses `trim()` and `split()` without eval or injection risk
- Empty values default to empty Set (backward compatible)

**API Parameter Sanitization**: ADEQUATE
- All parameters passed through TypeScript type system
- Notion API performs server-side validation
- No user input concatenated into URLs or code

## Spec Compliance Assessment

| Requirement | Status | Notes |
|------------|--------|-------|
| Add `notion_append_markdown` tool | ✅ PASS | Implemented in server/index.ts:292-318 |
| Add `notion_create_page_from_markdown` tool | ✅ PASS | Implemented in server/index.ts:320-360 |
| Support `NOTION_ENABLED_BLOCKS` env var | ✅ PASS | Parsed in index.ts:40-44 |
| Dynamic schema filtering | ✅ PASS | Implemented in types/common.ts:564-594 |
| Integrate `@tryfabric/martian` | ✅ PASS | Added to package.json, used in handlers |
| Tool schemas per spec lines 167-237 | ⚠️ PARTIAL | Schemas correct but `after` param not implemented |
| Filtering logic per spec lines 252-290 | ✅ PASS | Logic matches spec design |
| Handlers per spec lines 361-477 | ⚠️ PARTIAL | Missing `after` parameter implementation |
| `createPage()` method in client | ✅ PASS | Added to client/index.ts:432-445 |
| Backward compatibility maintained | ✅ PASS | Default empty Set = no filtering |
| Test coverage | ✅ PASS | 28 unit tests + 14 integration tests |

## Test Quality Assessment ⚠️

**Coverage**: EXCELLENT (28 unit + 14 integration + 48 existing = 90 total)
**Quality**: GOOD with caveats
- All critical paths tested
- Edge cases covered (empty markdown, nested lists, etc.)
- Error handling tested

**Issues**:
1. Excessive `@ts-ignore` usage (14 instances) suppresses type safety
2. Options tests don't verify behavior, only check for no errors
3. Mock implementation could be more specific

## Architectural Assessment ✅

**Design Principles**: SOUND
- Clean separation between Markdown tools and raw JSON tools
- Filtering system is elegant and non-invasive
- Backward compatibility preserved through default behavior

**Integration Quality**: EXCELLENT
- Martian library integration is clean
- New tools follow existing patterns
- Client wrapper extension is minimal and appropriate

**Code Organization**: GOOD
- New file `markdown-schemas.ts` follows conventions
- Filtering function in `common.ts` is logically placed
- Handler cases follow consistent structure

## Recommendation

**STATUS**: APPROVED WITH CHANGES

**Required Changes Before Merge**:
1. **CRITICAL**: Implement `after` parameter support OR remove from schema (src/server/index.ts:313)
2. **CRITICAL**: Add error handling for martian conversion failures (src/server/index.ts:307,339)
3. **MAJOR**: Reduce `@ts-ignore` usage in tests with proper type guards (src/markdown-tools.test.ts)
4. **MAJOR**: Fix type safety in `getFilteredBlockSchema()` return type (src/types/common.ts:591)

**Recommended Changes**:
5. Add interface definitions for Markdown tool arguments (src/types/args.ts)
6. Update environment variable documentation (src/index.ts:18-20)
7. Add comprehensive JSDoc for `createPage()` method (src/client/index.ts:432)
8. Fix terminology: "callouts" → "quotes" (src/types/markdown-schemas.ts:22)

**Next Steps**:
1. Address critical issues #1 and #2 above
2. Run full test suite to verify fixes
3. Complete Phase 5 (documentation) per spec lines 789-801
4. Manual testing with MCP Inspector per spec lines 675-698
5. Submit for final approval after changes

**Timeline Estimate**: 2-3 hours to address critical/major issues + 1 hour for documentation

## Final Assessment

The implementation demonstrates solid engineering: clean architecture, comprehensive testing, and good adherence to project conventions. The core functionality works as designed and achieves the stated goal of token reduction through Markdown tools and schema filtering.

However, the `after` parameter issue is a user-facing bug that violates the spec's explicit schema definition. This must be resolved before merge. The type safety issues, while not blocking, reduce the value of TypeScript's strict mode and should be addressed to maintain code quality standards.

Once the critical issues are resolved, this feature will be production-ready and a valuable addition to the MCP Notion Server.
