/**
 * Generate `types/supabase.ts` from the linked remote DB (not hand-written).
 * Prefers `supabase gen types` when Docker/CLI works; falls back to pg introspection.
 *
 * Usage: node scripts/gen-supabase-types.mjs
 */
const { execFileSync, spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const outFile = path.join(root, "types", "supabase.ts")

function loadEnv() {
  const envPath = path.join(root, ".env")
  const text = fs.readFileSync(envPath, "utf8")
  /** @type {Record<string, string>} */
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
  return env
}

function buildDbUrl(env) {
  const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD ?? "")
  const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0]
  // Session pooler (from supabase/.temp/pooler-url region)
  return `postgresql://postgres.${ref}:${password}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`
}

function tryCliGen(dbUrl) {
  const result = spawnSync(
    "npx",
    ["-y", "supabase@1.226.4", "gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"],
    { cwd: root, encoding: "utf8", shell: true }
  )
  if (result.status === 0 && result.stdout && result.stdout.includes("export type Database")) {
    return result.stdout
  }
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  console.error("[gen-supabase-types] CLI gen failed, falling back to pg introspection.")
  console.error(combined.slice(0, 800))
  return null
}

/**
 * Map postgres types to TypeScript.
 * @param {string} udt
 * @param {boolean} nullable
 */
function pgToTs(udt, nullable) {
  /** @type {Record<string, string>} */
  const map = {
    uuid: "string",
    text: "string",
    varchar: "string",
    bool: "boolean",
    boolean: "boolean",
    int2: "number",
    int4: "number",
    int8: "number",
    float4: "number",
    float8: "number",
    numeric: "number",
    jsonb: "Json",
    json: "Json",
    timestamptz: "string",
    timestamp: "string",
    date: "string",
  }
  const base = map[udt] ?? "string"
  return nullable ? `${base} | null` : base
}

/**
 * @param {string} dbUrl
 */
async function introspect(dbUrl) {
  try {
    require.resolve("pg")
  } catch {
    execFileSync("npm", ["install", "--no-save", "pg"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    })
  }
  const { Client } = require("pg")
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const { rows } = await client.query(`
    select
      c.relname as table_name,
      a.attname as column_name,
      format_type(a.atttypid, a.atttypmod) as formatted_type,
      t.typname as udt_name,
      not a.attnotnull as is_nullable,
      pg_get_expr(ad.adbin, ad.adrelid) as column_default,
      a.attnum
    from pg_attribute a
    join pg_class c on a.attrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    join pg_type t on a.atttypid = t.oid
    left join pg_attrdef ad on a.attrelid = ad.adrelid and a.attnum = ad.adnum
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname, a.attnum
  `)

  await client.end()

  /** @type {Map<string, Array<typeof rows[number]>>} */
  const byTable = new Map()
  for (const row of rows) {
    const list = byTable.get(row.table_name) ?? []
    list.push(row)
    byTable.set(row.table_name, list)
  }

  let body = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
`

  for (const [table, cols] of byTable) {
    body += `      ${table}: {\n        Row: {\n`
    for (const col of cols) {
      body += `          ${col.column_name}: ${pgToTs(col.udt_name, col.is_nullable)}\n`
    }
    body += `        }\n        Insert: {\n`
    for (const col of cols) {
      const optional =
        col.is_nullable ||
        col.column_default != null ||
        col.column_name === "id"
      const ts = pgToTs(col.udt_name, col.is_nullable)
      body += `          ${col.column_name}${optional ? "?" : ""}: ${ts}\n`
    }
    body += `        }\n        Update: {\n`
    for (const col of cols) {
      const ts = pgToTs(col.udt_name, col.is_nullable)
      body += `          ${col.column_name}?: ${ts}\n`
    }
    body += `        }\n        Relationships: []\n      }\n`
  }

  body += `    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
`

  return body
}

async function main() {
  const env = loadEnv()
  if (!env.SUPABASE_URL || !env.SUPABASE_DB_PASSWORD) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_DB_PASSWORD in .env")
  }

  const dbUrl = buildDbUrl(env)
  // Prefer live DB introspection (no Docker). CLI path needs Docker Desktop.
  const types = await introspect(dbUrl)

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, types.replace(/\r\n/g, "\n"), "utf8")
  console.log(`Wrote ${outFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
