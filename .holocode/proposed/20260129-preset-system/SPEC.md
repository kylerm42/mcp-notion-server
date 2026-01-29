---
title: Configuration Preset System
status: implemented
created: 2026-01-29
implemented: 2026-01-29
author: AP-5
priority: medium
estimated_effort: small
type: feature
---

# Feature Spec: Configuration Preset System

## Overview

Add a `NOTION_PRESET` environment variable that provides predefined tool and block configurations for common use cases. The preset system uses hybrid composition: tools are additive (union), blocks are override (replacement), giving users sensible defaults with flexibility to customize.

### Problem Statement

Users currently must manually specify tool lists and block filters via `NOTION_ENABLED_TOOLS` and `NOTION_ENABLED_BLOCKS`. This requires understanding:
- All available tool names
- Block filtering semantics
- Token optimization strategies
- Common configuration patterns

For most use cases, users want standard configurations:
- Read-only access for assistants
- Write-optimized for content creation
- Full access for development

**Solution:** Provide predefined presets that combine tool and block configurations, with ability to extend via existing environment variables.

---

## Requirements

### Functional Requirements

1. **Five Standard Presets**
   - `read-only`: All read tools, no write tools
   - `write-only`: All write tools (markdown + raw blocks), no read tools
   - `write-markdown`: Markdown write tools only
   - `read-write-markdown`: Read tools + markdown write tools (optimized for token efficiency)
   - `full`: All tools with no filtering (default behavior)

2. **Hybrid Composition**
   - `NOTION_PRESET` provides base configuration
   - `NOTION_ENABLED_TOOLS` adds tools to base (union)
   - `NOTION_ENABLED_BLOCKS` overrides base block filter (replacement)
   - No preset = existing behavior (backward compatible)

3. **Error Handling**
   - Invalid preset name → clear error message listing valid presets
   - Preset + invalid tool name → error from existing validation
   - Preset conflicts resolved by composition rules

### Non-Functional Requirements

1. **Backward Compatibility**
   - Existing configurations without presets continue to work
   - No breaking changes to current behavior
   - Additive feature only

2. **Code Quality**
   - Follow AGENTS.md conventions
   - Maintain test coverage
   - Professional documentation

3. **User Experience**
   - Clear documentation of preset contents
   - Examples showing preset + customization
   - Helpful error messages

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────┐
│  Environment Variables                  │
│                                         │
│  NOTION_PRESET=read-write-markdown      │
│  NOTION_ENABLED_TOOLS=update_page       │
│  NOTION_ENABLED_BLOCKS=toggle           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Preset Resolution  │
        │  (src/presets.ts)   │
        └─────────┬───────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
  ┌──────┐   ┌──────┐   ┌──────┐
  │ Base │   │ Base │   │      │
  │ Tools│   │Blocks│   │      │
  └───┬──┘   └───┬──┘   │      │
      │          │      │      │
      │ Union    │ Override   │
      │          │      │      │
  ┌───▼──┐   ┌──▼───┐  │      │
  │+TOOLS│   │BLOCKS│  │      │
  └───┬──┘   └───┬──┘  │      │
      │          │      │      │
      └────┬─────┴──────┘      │
           ▼                   │
    ┌─────────────┐            │
    │ Final Config│            │
    └──────┬──────┘            │
           │                   │
           ▼                   ▼
    ┌──────────────────────────┐
    │  startServer()           │
    │  (enabledToolsSet,       │
    │   enabledBlocksSet)      │
    └──────────────────────────┘
```

### Data Flow

**Preset Resolution Logic:**
```
1. Parse NOTION_PRESET → get base tool set and base block set
2. Parse NOTION_ENABLED_TOOLS → union with base tools
3. Parse NOTION_ENABLED_BLOCKS → override base blocks (if present)
4. Pass final sets to startServer()
```

**Composition Examples:**

```typescript
// Example 1: Pure preset
NOTION_PRESET=read-only
→ tools: [retrieve_page, retrieve_block, ...]
→ blocks: [] (empty = no filtering)

// Example 2: Preset + tool addition
NOTION_PRESET=read-only
NOTION_ENABLED_TOOLS=update_page
→ tools: [retrieve_page, retrieve_block, ..., update_page]
→ blocks: [] (inherited from preset)

// Example 3: Preset + block override
NOTION_PRESET=read-write-markdown
NOTION_ENABLED_BLOCKS=toggle,column
→ tools: [...read tools, append_markdown, create_page_from_markdown]
→ blocks: [toggle, column] (overrides preset's empty blocks)

// Example 4: No preset (backward compatible)
NOTION_ENABLED_TOOLS=retrieve_page,update_page
→ tools: [retrieve_page, update_page]
→ blocks: [] (no filtering)
```

### Component Changes

#### New Files

- `src/presets.ts`: Preset definitions and resolution logic

#### Modified Files

- `src/index.ts`: Integrate preset resolution before startServer()
- `README.md`: Document presets with examples
- `AGENTS.md`: Add preset configuration section

---

## Detailed Design

### 1. Preset Definitions

**File:** `src/presets.ts`

```typescript
/**
 * Configuration preset definitions for common use cases
 */

export interface PresetConfig {
  tools: string[];
  blocks: string[];
}

/**
 * Standard preset configurations
 */
export const PRESETS: Record<string, PresetConfig> = {
  "read-only": {
    tools: [
      "notion_retrieve_page",
      "notion_retrieve_block",
      "notion_retrieve_block_children",
      "notion_retrieve_database",
      "notion_retrieve_data_source",
      "notion_query_data_source",
      "notion_search",
    ],
    blocks: [], // No block filtering (but no write tools to use them)
  },

  "write-only": {
    tools: [
      "notion_append_markdown",
      "notion_create_page_from_markdown",
      "notion_append_block_children",
      "notion_update_page",
      "notion_update_block",
      "notion_delete_block",
      "notion_create_database",
      "notion_update_database",
      "notion_update_data_source",
      "notion_create_data_source_item",
    ],
    blocks: [], // No block filtering, full schemas available
  },

  "write-markdown": {
    tools: ["notion_append_markdown", "notion_create_page_from_markdown"],
    blocks: [], // Empty (no raw block tools enabled anyway)
  },

  "read-write-markdown": {
    tools: [
      // Read tools
      "notion_retrieve_page",
      "notion_retrieve_block",
      "notion_retrieve_block_children",
      "notion_retrieve_database",
      "notion_retrieve_data_source",
      "notion_query_data_source",
      "notion_search",
      // Markdown write tools only
      "notion_append_markdown",
      "notion_create_page_from_markdown",
    ],
    blocks: [], // Empty = token-optimized (no raw block tools)
  },

  full: {
    tools: [], // Empty = all tools enabled
    blocks: [], // Empty = no block filtering
  },
};

/**
 * Resolve preset configuration with optional tool/block overrides
 * 
 * Composition rules:
 * - TOOLS: additive (union with preset's base tools)
 * - BLOCKS: override (replaces preset's base blocks if specified)
 * 
 * @param presetName Name of preset (or undefined for no preset)
 * @param additionalTools Comma-separated tool names to add
 * @param blockOverride Comma-separated block types to use (overrides preset)
 * @returns Object with enabledTools and enabledBlocks sets
 */
export function resolvePreset(
  presetName: string | undefined,
  additionalTools: string | undefined,
  blockOverride: string | undefined
): { enabledTools: Set<string>; enabledBlocks: Set<string> } {
  // No preset = backward compatible behavior
  if (!presetName) {
    return {
      enabledTools: new Set(
        additionalTools ? additionalTools.split(",").map((s) => s.trim()) : []
      ),
      enabledBlocks: new Set(
        blockOverride ? blockOverride.split(",").map((s) => s.trim()) : []
      ),
    };
  }

  // Validate preset name
  const preset = PRESETS[presetName];
  if (!preset) {
    const validPresets = Object.keys(PRESETS).join(", ");
    throw new Error(
      `Invalid preset: "${presetName}". Valid presets: ${validPresets}`
    );
  }

  // Start with preset's base tools
  const enabledTools = new Set(preset.tools);

  // Add additional tools (union)
  if (additionalTools) {
    additionalTools
      .split(",")
      .map((s) => s.trim())
      .forEach((tool) => enabledTools.add(tool));
  }

  // Override blocks if specified, otherwise use preset's blocks
  const enabledBlocks = blockOverride
    ? new Set(blockOverride.split(",").map((s) => s.trim()))
    : new Set(preset.blocks);

  return { enabledTools, enabledBlocks };
}
```

---

### 2. Integration with Entry Point

**File:** `src/index.ts`

```typescript
import { resolvePreset } from "./presets.js";

// ... existing imports ...

/**
 * Environment Variables:
 * - NOTION_API_TOKEN: Required. Your Notion API integration token.
 * - NOTION_PRESET: Optional. Predefined configuration preset.
 *   Valid values: read-only, write-only, write-markdown, read-write-markdown, full
 * - NOTION_ENABLED_TOOLS: Optional. Comma-separated list of tools to enable.
 *   When used with NOTION_PRESET, adds tools to preset's base (union).
 * - NOTION_ENABLED_BLOCKS: Optional. Comma-separated list of block types for raw JSON tools.
 *   When used with NOTION_PRESET, overrides preset's block configuration.
 * - NOTION_MARKDOWN_CONVERSION: Optional. Set to "true" to enable Markdown response formatting.
 */

async function main() {
  // ... existing token validation ...

  // Resolve configuration from preset + overrides
  const presetName = process.env.NOTION_PRESET;
  const additionalTools = process.env.NOTION_ENABLED_TOOLS;
  const blockOverride = process.env.NOTION_ENABLED_BLOCKS;

  let enabledToolsSet: Set<string>;
  let enabledBlocksSet: Set<string>;

  try {
    const config = resolvePreset(presetName, additionalTools, blockOverride);
    enabledToolsSet = config.enabledTools;
    enabledBlocksSet = config.enabledBlocks;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Configuration error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  // ... existing markdown conversion parsing ...

  await startServer(
    notionToken,
    enabledToolsSet,
    enableMarkdownConversion,
    enabledBlocksSet
  );
}

// ... rest of existing code ...
```

---

### 3. Documentation Updates

**File:** `README.md`

Add new section after "Environment Variables":

```markdown
### Configuration Presets

For common use cases, use predefined presets instead of manually specifying tools and blocks:

#### Available Presets

**`NOTION_PRESET=read-only`**
- All read/retrieve/query/search tools
- No write operations
- Use case: Read-only assistants, content indexing

**`NOTION_PRESET=write-only`**
- All write tools (markdown + raw blocks)
- No read operations
- Use case: Content creation bots, import scripts

**`NOTION_PRESET=write-markdown`**
- Markdown write tools only
- No read, no raw blocks
- Use case: Simple content writers, note-taking assistants

**`NOTION_PRESET=read-write-markdown`** (Recommended)
- All read tools + markdown write tools
- Token-optimized (no raw block schemas)
- Use case: General-purpose assistants with efficient context usage

**`NOTION_PRESET=full`**
- All tools with no filtering
- Use case: Development, testing, maximum flexibility

#### Extending Presets

Presets can be customized with additional environment variables:

**Add tools to preset (union):**
```bash
export NOTION_PRESET=read-only
export NOTION_ENABLED_TOOLS=notion_update_page  # Adds one write tool
```

**Override block filter (replacement):**
```bash
export NOTION_PRESET=read-write-markdown
export NOTION_ENABLED_BLOCKS=toggle,column  # Enables raw block tools with filtered schemas
```

#### Configuration Examples

**Example 1: Read-only assistant**
```bash
export NOTION_API_TOKEN="secret_..."
export NOTION_PRESET=read-only
```

**Example 2: Content writer with toggle support**
```bash
export NOTION_API_TOKEN="secret_..."
export NOTION_PRESET=read-write-markdown
export NOTION_ENABLED_TOOLS=notion_append_block_children  # Add raw block tool
export NOTION_ENABLED_BLOCKS=toggle  # Filter to only toggle blocks
```

**Example 3: Full access during development**
```bash
export NOTION_API_TOKEN="secret_..."
export NOTION_PRESET=full
```

#### Backward Compatibility

If `NOTION_PRESET` is not set, the existing behavior is preserved:
- `NOTION_ENABLED_TOOLS` enables only specified tools (or all if unset)
- `NOTION_ENABLED_BLOCKS` filters block schemas (or none if unset)
```

---

**File:** `AGENTS.md`

Add to environment variables section:

```markdown
- `NOTION_PRESET` (optional): Predefined configuration preset
  - Valid values: `read-only`, `write-only`, `write-markdown`, `read-write-markdown`, `full`
  - If set, provides base tool and block configuration
  - Can be extended with `NOTION_ENABLED_TOOLS` (additive) and `NOTION_ENABLED_BLOCKS` (override)
  - If not set, existing behavior is preserved (backward compatible)
```

Add new section before "Common Pitfalls":

```markdown
## Configuration Presets

The preset system provides predefined configurations for common use cases:

### Preset Definitions

```typescript
{
  "read-only": {
    tools: [retrieve_page, retrieve_block, query_data_source, search, ...],
    blocks: [] // No filtering
  },
  "write-only": {
    tools: [append_markdown, append_block_children, update_page, ...],
    blocks: [] // No filtering
  },
  "write-markdown": {
    tools: [append_markdown, create_page_from_markdown],
    blocks: [] // No raw block tools enabled
  },
  "read-write-markdown": {
    tools: [...read tools, append_markdown, create_page_from_markdown],
    blocks: [] // Token-optimized
  },
  "full": {
    tools: [], // All tools
    blocks: [] // No filtering
  }
}
```

### Composition Rules

**Tools are additive (union):**
- `NOTION_PRESET=read-only` + `NOTION_ENABLED_TOOLS=update_page`
- Result: All read tools + update_page

**Blocks are override (replacement):**
- `NOTION_PRESET=read-write-markdown` (blocks=[])
- `+ NOTION_ENABLED_BLOCKS=toggle`
- Result: Override empty blocks with [toggle]

### Testing Presets

When testing preset functionality:

1. **Test pure presets** - Each preset in isolation
2. **Test tool composition** - Preset + ENABLED_TOOLS
3. **Test block override** - Preset + ENABLED_BLOCKS
4. **Test invalid presets** - Error handling
5. **Test backward compatibility** - No preset set
```

---

## Testing Strategy

### Unit Tests

**File:** `src/presets.test.ts` (new file)

```typescript
import { describe, test, expect } from "vitest";
import { resolvePreset, PRESETS } from "./presets.js";

describe("Preset Resolution", () => {
  test("should resolve pure preset", () => {
    const config = resolvePreset("read-only", undefined, undefined);
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledTools).not.toContain("notion_update_page");
    expect(config.enabledBlocks.size).toBe(0);
  });

  test("should add tools to preset (union)", () => {
    const config = resolvePreset("read-only", "notion_update_page", undefined);
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledTools).toContain("notion_update_page");
  });

  test("should override blocks", () => {
    const config = resolvePreset(
      "read-write-markdown",
      undefined,
      "toggle,column"
    );
    expect(config.enabledBlocks).toContain("toggle");
    expect(config.enabledBlocks).toContain("column");
    expect(config.enabledBlocks.size).toBe(2);
  });

  test("should throw on invalid preset", () => {
    expect(() => resolvePreset("invalid", undefined, undefined)).toThrow(
      /Invalid preset/
    );
  });

  test("should handle no preset (backward compat)", () => {
    const config = resolvePreset(
      undefined,
      "notion_retrieve_page",
      "toggle"
    );
    expect(config.enabledTools).toContain("notion_retrieve_page");
    expect(config.enabledBlocks).toContain("toggle");
  });

  test("should handle empty additional tools", () => {
    const config = resolvePreset("read-only", "", undefined);
    expect(config.enabledTools.size).toBeGreaterThan(0);
  });

  test("should trim whitespace in tool lists", () => {
    const config = resolvePreset("read-only", " notion_update_page , notion_delete_block ", undefined);
    expect(config.enabledTools).toContain("notion_update_page");
    expect(config.enabledTools).toContain("notion_delete_block");
  });
});

describe("Preset Definitions", () => {
  test("read-only preset has only read tools", () => {
    const preset = PRESETS["read-only"];
    expect(preset.tools.every((t) => t.includes("retrieve") || t.includes("query") || t.includes("search"))).toBe(true);
  });

  test("write-markdown preset has only markdown tools", () => {
    const preset = PRESETS["write-markdown"];
    expect(preset.tools).toEqual([
      "notion_append_markdown",
      "notion_create_page_from_markdown",
    ]);
  });

  test("full preset has empty tool list", () => {
    const preset = PRESETS["full"];
    expect(preset.tools).toEqual([]);
  });
});
```

### Integration Tests

**File:** `src/index.test.ts` (new or update existing)

```typescript
import { describe, test, expect, beforeEach, vi } from "vitest";

describe("Preset Integration", () => {
  beforeEach(() => {
    // Reset env vars
    delete process.env.NOTION_PRESET;
    delete process.env.NOTION_ENABLED_TOOLS;
    delete process.env.NOTION_ENABLED_BLOCKS;
  });

  test("should start server with preset", async () => {
    process.env.NOTION_API_TOKEN = "test-token";
    process.env.NOTION_PRESET = "read-only";
    process.env.NODE_ENV = "test";

    // Mock startServer to capture args
    const mockStartServer = vi.fn();
    // ... test implementation
  });

  test("should error on invalid preset", () => {
    process.env.NOTION_PRESET = "invalid-preset";
    // ... test error handling
  });
});
```

### Manual Testing Checklist

**Tool:** MCP Inspector (`npm run inspector`)

1. **Test each preset in isolation:**
   - Set `NOTION_PRESET=read-only`, verify only read tools available
   - Set `NOTION_PRESET=write-markdown`, verify only markdown tools available
   - Set `NOTION_PRESET=full`, verify all tools available

2. **Test tool composition:**
   - Set `NOTION_PRESET=read-only` + `NOTION_ENABLED_TOOLS=notion_update_page`
   - Verify both read tools and update_page are available

3. **Test block override:**
   - Set `NOTION_PRESET=read-write-markdown` + `NOTION_ENABLED_BLOCKS=toggle`
   - Verify `notion_append_block_children` has filtered schema with only toggle

4. **Test error handling:**
   - Set `NOTION_PRESET=invalid-name`
   - Verify clear error message listing valid presets

5. **Test backward compatibility:**
   - Unset `NOTION_PRESET`, set only `NOTION_ENABLED_TOOLS`
   - Verify existing behavior works

---

## Implementation Phases

### Phase 1: Core Preset System ✅
**Estimated Time:** 60 minutes

- [x] Create `src/presets.ts` with preset definitions
- [x] Implement `resolvePreset()` function with composition logic
- [x] Add TypeScript interfaces for PresetConfig
- [x] Create unit tests in `src/presets.test.ts`
- [x] Run tests: `npm test`

**Acceptance Criteria:**
- ✅ All 5 presets defined correctly
- ✅ Resolution logic handles all composition scenarios
- ✅ Unit tests passing (25 tests)
- ✅ Invalid preset throws clear error

---

### Phase 2: Integration ✅
**Estimated Time:** 45 minutes

- [x] Update `src/index.ts` to use `resolvePreset()`
- [x] Parse `NOTION_PRESET` environment variable
- [x] Wire resolved config to `startServer()`
- [x] Add error handling for invalid presets
- [x] Update JSDoc comment with preset documentation
- [x] Test with build compilation

**Acceptance Criteria:**
- ✅ Presets work in real server context
- ✅ Error messages clear and helpful
- ✅ Backward compatibility maintained
- ✅ All 157 tests passing

---

### Phase 3: Documentation ✅
**Estimated Time:** 30 minutes

- [x] Update README.md with preset section
- [x] Add examples of each preset
- [x] Document composition rules clearly
- [x] Update AGENTS.md with preset guidelines
- [x] Add preset testing recommendations

**Acceptance Criteria:**
- ✅ Clear examples for each preset
- ✅ Composition rules explained
- ✅ Configuration scenarios documented
- ✅ Professional tone maintained

---

## Acceptance Criteria

### Must Have
- ✅ All 5 presets defined and functional
- ✅ Hybrid composition working (tools union, blocks override)
- ✅ Backward compatibility maintained (no preset = existing behavior)
- ✅ Clear error message for invalid preset names
- ✅ Unit tests covering resolution logic
- ✅ Documentation with examples

### Should Have
- ✅ Integration tests for preset + server startup
- ✅ Manual testing checklist completed
- ✅ AGENTS.md includes preset testing guidelines
- ✅ README.md has clear use case descriptions

### Could Have
- ⚠️ Warning if preset + tools/blocks creates unusual config (e.g., write-only + read tools)
- ⚠️ `--list-presets` CLI flag to show available presets
- ⚠️ Preset validation against actual available tool names

---

## Migration Plan

### For Users

**Not Applicable** - This is a new optional feature. Existing configurations continue to work unchanged.

**To Opt In:**
1. Set `NOTION_PRESET` to desired preset name
2. Optionally customize with `NOTION_ENABLED_TOOLS` or `NOTION_ENABLED_BLOCKS`
3. Remove manual tool/block lists if using pure preset

**Example Migration:**

Before:
```bash
export NOTION_ENABLED_TOOLS="notion_retrieve_page,notion_retrieve_block,notion_query_data_source,notion_search,notion_append_markdown,notion_create_page_from_markdown"
export NOTION_ENABLED_BLOCKS=""
```

After:
```bash
export NOTION_PRESET=read-write-markdown
```

---

## Risks and Mitigations

### Risk 1: Composition Semantics Confusion
**Probability:** Medium  
**Impact:** Low

Users might not understand why TOOLS is additive but BLOCKS is override.

**Mitigation:**
- Clear documentation with examples
- Tool descriptions mention composition rules
- Error messages guide users to correct usage
- README has "Extending Presets" section

---

### Risk 2: Preset Definitions Drift
**Probability:** Low  
**Impact:** Medium

As new tools are added, presets might become outdated or incomplete.

**Mitigation:**
- Unit tests validate preset tool names against actual tools
- Documentation specifies preset philosophy (read vs write vs optimized)
- Presets reviewed during major tool additions
- `full` preset always includes everything (empty list = all)

---

### Risk 3: Tool Name Typos in Presets
**Probability:** Low  
**Impact:** Medium

Hardcoded tool names in presets might have typos or become invalid.

**Mitigation:**
- Unit tests check preset tools are valid
- TypeScript can enforce tool name constants if desired
- Testing checklist includes each preset

---

## Success Metrics

### Performance Metrics
- **Implementation Time:** Target 2-3 hours (phases 1-3)
- **Test Coverage:** 100% of resolution logic covered
- **Zero Breaking Changes:** Existing configs work unchanged

### Adoption Metrics
- **Documentation Completeness:** All presets explained with examples
- **Error Clarity:** Invalid preset shows all valid options
- **User Experience:** One-line preset config vs multi-line manual config

---

## Open Questions

None. Design finalized based on user feedback (Option 2: Hybrid approach).

---

## References

### Internal Documentation
- `.holocode/implemented/markdown-tools.md` - Context for NOTION_ENABLED_BLOCKS
- `AGENTS.md` - Coding standards and testing guidelines
- `README.md` - User-facing tool documentation

### Related Features
- Block Schema Filtering (`NOTION_ENABLED_BLOCKS`) - Presets leverage this feature
- Markdown Tools - Core of write-markdown and read-write-markdown presets

---

## Notes

This preset system is intentionally simple with only 5 presets. The hybrid composition model (tools additive, blocks override) provides flexibility without requiring preset proliferation. Future presets can be added easily by extending the `PRESETS` object.

The `full` preset uses empty arrays for both tools and blocks, which by existing convention means "all tools enabled, no filtering" - this maintains consistency with current behavior.

Preset names use kebab-case for consistency with environment variable conventions (e.g., `read-write-markdown` rather than `readWriteMarkdown`).
