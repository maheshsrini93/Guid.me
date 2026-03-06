import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ============================================================
// jobs — Generation Jobs
// ============================================================

export const jobs = sqliteTable("jobs", {
  /** Unique job identifier (ULID) */
  id: text("id").primaryKey(),
  /** Current pipeline status */
  status: text("status", {
    enum: [
      "pending",
      "extracting",
      "analyzing",
      "composing",
      "enforcing",
      "reviewing",
      "revising",
      "illustrating",
      "assembling",
      "completed",
      "failed",
      "cancelled",
    ],
  })
    .notNull()
    .default("pending"),
  /** Quality decision after review */
  qualityDecision: text("quality_decision", {
    enum: ["approved", "revise", "hold"],
  }),
  /** Quality score (0-100) */
  qualityScore: integer("quality_score"),

  // --- Document Info ---
  /** Original filename */
  filename: text("filename").notNull(),
  /** Document MIME type */
  mimeType: text("mime_type").notNull(),
  /** File size in bytes */
  fileSize: integer("file_size").notNull(),
  /** Path to uploaded file */
  filePath: text("file_path").notNull(),
  /** Number of pages in the document */
  pageCount: integer("page_count"),

  // --- Configuration ---
  /** Display name for the guide */
  documentName: text("document_name"),
  /** Content domain */
  domain: text("domain").default("general"),
  /** Quality threshold for auto-approval */
  qualityThreshold: integer("quality_threshold").default(85),
  /** Whether to generate illustrations */
  generateIllustrations: integer("generate_illustrations", {
    mode: "boolean",
  }).default(true),

  // --- Timing ---
  /** Job creation timestamp */
  createdAt: text("created_at").notNull(),
  /** Pipeline start timestamp */
  startedAt: text("started_at"),
  /** Pipeline completion timestamp */
  completedAt: text("completed_at"),

  // --- Costs ---
  /** Total cost in USD */
  totalCostUsd: real("total_cost_usd").default(0),

  // --- Pipeline State ---
  /** Number of text revision loops executed */
  textRevisionCount: integer("text_revision_count").default(0),
  /** Current agent being executed */
  currentAgent: text("current_agent"),

  // --- Error ---
  /** Error message if failed */
  errorMessage: text("error_message"),
});

// ============================================================
// agent_executions — Per-Agent Execution Records
// ============================================================

export const agentExecutions = sqliteTable("agent_executions", {
  /** Unique execution identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  /** Agent identifier */
  agentName: text("agent_name").notNull(),
  /** Execution order within the pipeline */
  executionOrder: integer("execution_order").notNull(),

  // --- Model Info ---
  /** Model used (e.g., "gemini-2.5-flash", "gemini-2.5-pro") */
  model: text("model"),
  /** Whether this was an escalation (Flash -> Pro) */
  wasEscalation: integer("was_escalation", { mode: "boolean" }).default(false),

  // --- I/O ---
  /** Prompt sent to the model (for AI agents) */
  promptSent: text("prompt_sent"),
  /** Response received from the model */
  responseReceived: text("response_received"),
  /** Structured output (JSON string) */
  structuredOutput: text("structured_output"),

  // --- Tokens & Cost ---
  /** Input tokens consumed */
  inputTokens: integer("input_tokens").default(0),
  /** Output tokens produced */
  outputTokens: integer("output_tokens").default(0),
  /** Cost in USD */
  costUsd: real("cost_usd").default(0),
  /** Prompt version identifier (e.g. "vision-analyzer@1.0") */
  promptVersion: text("prompt_version"),

  // --- Timing ---
  /** Start timestamp */
  startedAt: text("started_at").notNull(),
  /** End timestamp */
  completedAt: text("completed_at"),
  /** Duration in milliseconds */
  durationMs: integer("duration_ms"),

  // --- Status ---
  /** Execution status */
  status: text("status", {
    enum: ["running", "completed", "failed"],
  })
    .notNull()
    .default("running"),
  /** Error message if failed */
  errorMessage: text("error_message"),
});

// ============================================================
// generated_guides — Output Work Instructions
// ============================================================

export const generatedGuides = sqliteTable("generated_guides", {
  /** Unique guide identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id)
    .unique(),

  // --- Output ---
  /** Complete XML output */
  xmlContent: text("xml_content"),
  /** JSON representation of the guide */
  jsonContent: text("json_content"),
  /** Path to saved XML file */
  xmlFilePath: text("xml_file_path"),

  // --- Quality ---
  /** Overall quality score */
  qualityScore: integer("quality_score"),
  /** Quality decision */
  qualityDecision: text("quality_decision", {
    enum: ["approved", "revise", "hold"],
  }),
  /** Quality issues (JSON array) */
  qualityIssues: text("quality_issues"),
  /** Safety issues (JSON array) */
  safetyIssues: text("safety_issues"),

  // --- Metadata ---
  /** Number of steps in the guide */
  stepCount: integer("step_count"),
  /** Number of phases */
  phaseCount: integer("phase_count"),
  /** Guide title */
  title: text("title"),
  /** Domain */
  domain: text("domain"),
  /** Estimated completion time in minutes */
  estimatedMinutes: integer("estimated_minutes"),
  /** Safety level classification */
  safetyLevel: text("safety_level"),

  // --- Generation Metadata ---
  /** Models used (JSON array) */
  modelsUsed: text("models_used"),
  /** Number of text revision loops */
  textRevisionLoops: integer("text_revision_loops"),
  /** Total generation cost */
  totalCostUsd: real("total_cost_usd"),
  /** Generation timestamp */
  generatedAt: text("generated_at").notNull(),
});

// ============================================================
// generated_illustrations — Per-Step Illustrations
// ============================================================

export const generatedIllustrations = sqliteTable("generated_illustrations", {
  /** Unique illustration identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
  /** Foreign key to generated_guides table */
  guideId: text("guide_id")
    .notNull()
    .references(() => generatedGuides.id),

  // --- Step Info ---
  /** Step number this illustration belongs to */
  stepNumber: integer("step_number").notNull(),

  // --- Image ---
  /** Path to saved illustration file */
  filePath: text("file_path").notNull(),
  /** Image MIME type */
  mimeType: text("mime_type").notNull().default("image/png"),
  /** Image width in pixels */
  width: integer("width"),
  /** Image height in pixels */
  height: integer("height"),

  // --- Generation ---
  /** Model used for generation */
  model: text("model"),
  /** Generation cost in USD */
  costUsd: real("cost_usd"),
  /** Generation duration in milliseconds */
  durationMs: integer("duration_ms"),
  /** Generation timestamp */
  generatedAt: text("generated_at").notNull(),
});

// ============================================================
// Indexes
// ============================================================

export const jobStatusIdx = index("idx_jobs_status").on(jobs.status);
export const jobCreatedIdx = index("idx_jobs_created_at").on(jobs.createdAt);
export const agentExecJobIdx = index("idx_agent_exec_job_id").on(
  agentExecutions.jobId,
);
export const illustrationJobIdx = index("idx_illustrations_job_id").on(
  generatedIllustrations.jobId,
);
export const illustrationStepIdx = index("idx_illustrations_step").on(
  generatedIllustrations.jobId,
  generatedIllustrations.stepNumber,
);
