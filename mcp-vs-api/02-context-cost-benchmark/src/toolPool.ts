/**
 * Generates realistic MCP tool schemas at any pool size, modeled on a
 * GitHub-style MCP server (the exact example the post cites for the 50K
 * token init cost): CRUD-ish operations across a set of resource nouns,
 * each with a description and JSON Schema shaped like what a real
 * `tools/list` response returns.
 */

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

const RESOURCES = [
  "repository",
  "issue",
  "pull_request",
  "commit",
  "branch",
  "file",
  "release",
  "workflow_run",
  "deployment",
  "secret",
  "webhook",
  "label",
  "milestone",
  "comment",
  "review",
  "team",
  "organization",
  "user",
  "package",
  "gist",
  "project",
  "discussion",
  "notification",
  "check_run",
  "artifact",
  "environment",
  "collaborator",
  "tag",
  "star",
  "topic",
];

interface OperationSpec {
  verb: string;
  params: Record<string, unknown>;
  required: string[];
  describe: (resource: string) => string;
}

const OPERATIONS: OperationSpec[] = [
  {
    verb: "get",
    params: { owner: { type: "string" }, repo: { type: "string" }, id: { type: "string" } },
    required: ["owner", "repo", "id"],
    describe: (r) =>
      `Fetch a single ${r} by its identifier. Returns full metadata including timestamps, ` +
      `author information, current status, and all fields associated with this resource type. ` +
      `Use this when you already know the specific ${r} you need rather than searching for it.`,
  },
  {
    verb: "list",
    params: {
      owner: { type: "string" },
      repo: { type: "string" },
      state: { type: "string", enum: ["open", "closed", "all"] },
      per_page: { type: "integer", minimum: 1, maximum: 100 },
      page: { type: "integer", minimum: 1 },
    },
    required: ["owner", "repo"],
    describe: (r) =>
      `List ${r} resources for a repository, with optional state filtering and pagination. ` +
      `Returns an array of summaries rather than full detail — call the corresponding get tool ` +
      `for complete information about a specific ${r}.`,
  },
  {
    verb: "create",
    params: {
      owner: { type: "string" },
      repo: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      metadata: { type: "object" },
    },
    required: ["owner", "repo", "title"],
    describe: (r) =>
      `Create a new ${r} in the given repository. Requires a title and accepts an optional ` +
      `body and free-form metadata. Returns the newly created ${r} including its generated id.`,
  },
  {
    verb: "update",
    params: {
      owner: { type: "string" },
      repo: { type: "string" },
      id: { type: "string" },
      fields: { type: "object" },
    },
    required: ["owner", "repo", "id", "fields"],
    describe: (r) =>
      `Update fields on an existing ${r}. Only the fields provided are changed; omitted ` +
      `fields keep their current value. Returns the updated ${r}.`,
  },
  {
    verb: "delete",
    params: { owner: { type: "string" }, repo: { type: "string" }, id: { type: "string" } },
    required: ["owner", "repo", "id"],
    describe: (r) => `Permanently delete a ${r} by id. This action cannot be undone.`,
  },
];

const BASE_POOL_SIZE = RESOURCES.length * OPERATIONS.length;

/**
 * Deterministically generates `count` distinct tool schemas. The base
 * resource x operation grid provides RESOURCES.length * OPERATIONS.length
 * (150) naturally-worded tools; requesting more than that cycles through
 * the grid again with a numbered API-version suffix (github_get_issue_v2,
 * _v3, ...) so every generated schema is still distinct and comparably
 * sized, the way a real API surface accretes versioned or scoped
 * duplicates (per-org variants, v2 endpoints, etc.) well past its "core"
 * tool count.
 */
export function generateToolPool(count: number): ToolSchema[] {
  const tools: ToolSchema[] = [];
  let generation = 1;
  while (tools.length < count) {
    const suffix = generation === 1 ? "" : `_v${generation}`;
    outer: for (const resource of RESOURCES) {
      for (const op of OPERATIONS) {
        if (tools.length >= count) break outer;
        tools.push({
          name: `github_${op.verb}_${resource}${suffix}`,
          description: op.describe(resource) + (suffix ? ` (API version ${generation}.)` : ""),
          inputSchema: {
            type: "object",
            properties: op.params,
            required: op.required,
          },
        });
      }
    }
    generation += 1;
  }
  return tools;
}

export { BASE_POOL_SIZE };

/** A minimal schema for a "search tools" meta-tool, used by the lazy-disclosure strategy. */
export function searchToolsMetaSchema(): ToolSchema {
  return {
    name: "search_tools",
    description:
      "Search available tools by keyword and return matching tool names with one-line " +
      "summaries. Call describe_tool on a specific result to get its full schema before using it.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  };
}
