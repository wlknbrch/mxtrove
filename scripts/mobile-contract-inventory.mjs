import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slash = (value) => value.split(path.sep).join("/");
export function filesUnder(root, directory) {
  const full = path.join(root, directory);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const name = slash(path.join(directory, entry.name));
    return entry.isDirectory() ? filesUnder(root, name) : [name];
  }).sort();
}

// Keep dollar-quoted function bodies, nested comments and quoted semicolons intact.
// This is a statement scanner, not a SQL evaluator. Never infer deployed grants from it.
export function sqlStatements(text) {
  const result = [];
  let start = 0, quote = null, dollar = null, commentDepth = 0, lineComment = false;
  for (let i = 0; i < text.length; i++) {
    if (lineComment) { if (text[i] === "\n") lineComment = false; continue; }
    if (commentDepth) {
      if (text.slice(i, i + 2) === "/*") { commentDepth++; i++; }
      else if (text.slice(i, i + 2) === "*/") { commentDepth--; i++; }
      continue;
    }
    if (dollar) { if (text.startsWith(dollar, i)) { i += dollar.length - 1; dollar = null; } continue; }
    if (quote) {
      if (text[i] === quote) { if (text[i + 1] === quote) i++; else quote = null; }
      continue;
    }
    if (text.slice(i, i + 2) === "--") { lineComment = true; i++; continue; }
    if (text.slice(i, i + 2) === "/*") { commentDepth = 1; i++; continue; }
    if (text[i] === "'" || text[i] === '"') { quote = text[i]; continue; }
    const match = text.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);
    if (match) { dollar = match[0]; i += dollar.length - 1; continue; }
    if (text[i] === ";") { const raw = text.slice(start, i + 1); result.push({ sql: raw.trim(), offset: start + raw.length - raw.trimStart().length }); start = i + 1; }
  }
  if (text.slice(start).trim()) { const raw = text.slice(start); result.push({ sql: raw.trim(), offset: start + raw.length - raw.trimStart().length }); }
  return result;
}

function removeLeadingComments(sql) {
  return sql.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, "");
}
function splitArgs(text) {
  const result = []; let start = 0, depth = 0, quote = null;
  for (let i = 0; i < text.length; i++) {
    if (quote) { if (text[i] === quote) { if (text[i + 1] === quote) i++; else quote = null; } continue; }
    if (text[i] === "'" || text[i] === '"') quote = text[i];
    else if (text[i] === "(" || text[i] === "[") depth++;
    else if (text[i] === ")" || text[i] === "]") depth--;
    else if (text[i] === "," && depth === 0) { result.push(text.slice(start, i).trim()); start = i + 1; }
  }
  if (text.slice(start).trim()) result.push(text.slice(start).trim());
  return result;
}
function balancedEnd(text, start) {
  let depth = 0, quote = null;
  for (let i = start; i < text.length; i++) {
    if (quote) { if (text[i] === quote) { if (text[i + 1] === quote) i++; else quote = null; } continue; }
    if (text[i] === "'" || text[i] === '"') quote = text[i];
    else if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  throw new Error("Unbalanced SQL signature");
}

export function buildInventory(root = defaultRoot) {
  const inventory = { formatVersion: 1, routes: [], featureApis: [], uiActions: [], calls: [], models: [], endpoints: [], tables: [], views: [], functions: [], policies: [], sqlSecurityStatements: [], migrations: [], sourceFiles: [], configurationFiles: [] };
  for (const file of ["package.json", "package-lock.json", "services/media-worker/package.json", "services/media-worker/package-lock.json", ".nvmrc", "vite.config.ts", "supabase/config.toml", "docker-compose.production.yml", "docker-compose.selfhost.yml"]) {
    inventory.configurationFiles.push({ file, sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex") });
  }
  const sources = [...filesUnder(root, "src"), ...filesUnder(root, "services/media-worker/src"), ...filesUnder(root, "supabase/functions")]
    .filter((file) => /\.(tsx?|sql)$/.test(file) && !/\.test\./.test(file));
  for (const file of sources) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    inventory.sourceFiles.push({ file, sha256: crypto.createHash("sha256").update(text).digest("hex") });
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const location = (node) => ({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
    const exported = (node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const callsIn = (node) => {
      const calls = [];
      function walk(n) {
        if (ts.isCallExpression(n)) {
          const expression = n.expression.getText(source);
          const name = ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : expression;
          if ((["rpc", "from", "fetch", "workerRequest", "protectedMediaRequest", "on", "channel"].includes(name) && expression !== "Array.from") || /\.auth\./.test(expression)) {
            const argument = n.arguments[0];
            const targets = argument && ts.isConditionalExpression(argument) && ts.isStringLiteral(argument.whenTrue) && ts.isStringLiteral(argument.whenFalse) ? [argument.whenTrue.text, argument.whenFalse.text] : argument && ts.isStringLiteral(argument) ? [argument.text] : [];
            calls.push({ kind: name, target: argument ? ts.isStringLiteral(argument) ? argument.text : argument.getText(source) : null, targets, expression: n.getText(source), ...location(n) });
          }
        }
        ts.forEachChild(n, walk);
      }
      walk(node); return calls;
    };
    function visit(node, routeGuard = "public") {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((property) => [property.name.getText(source).replace(/["']/g, ""), property.initializer]));
        const element = properties.element?.getText(source) ?? "";
        if (element.includes("<ProtectedRoute")) routeGuard = "session-and-terms";
        if (file === "src/routes/router.tsx" && ts.isStringLiteral(properties.path ?? {})) {
          inventory.routes.push({ path: properties.path.text, guard: routeGuard, element, ...location(node) });
        }
      }
      if (ts.isFunctionDeclaration(node) && node.name && exported(node) && file.startsWith("src/features/")) {
        inventory.featureApis.push({ name: node.name.text, signature: node.getText(source).slice(0, node.body ? node.body.getStart(source) - node.getStart(source) : undefined).trim(), apiFile: /(?:^|[-/])api\.ts$/.test(file), calls: callsIn(node), ...location(node) });
      }
      if (ts.isVariableStatement(node) && exported(node) && file.startsWith("src/features/")) {
        for (const declaration of node.declarationList.declarations) {
          if (declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
            inventory.featureApis.push({ name: declaration.name.getText(source), signature: declaration.getText(source).split("=>")[0], apiFile: /(?:^|[-/])api\.ts$/.test(file), calls: callsIn(declaration), ...location(node) });
          }
        }
      }
      if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && exported(node)) {
        const properties = ts.isInterfaceDeclaration(node) ? node.members.filter(ts.isPropertySignature).map((member) => ({ name: member.name.getText(source), optional: Boolean(member.questionToken), type: member.type?.getText(source) ?? "unknown" })) : [];
        const enumValues = ts.isTypeAliasDeclaration(node) && ts.isUnionTypeNode(node.type) && node.type.types.every((type) => ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) ? node.type.types.map((type) => type.literal.text) : null;
        inventory.models.push({ name: node.name.text, declaration: node.getText(source), properties, enumValues, ...location(node) });
      }
      if (ts.isJsxAttribute(node) && /^(on[A-Z]\w*|to|href)$/.test(node.name.getText(source))) {
        const element = node.parent?.parent;
        const label = element?.parent && ts.isJsxElement(element.parent) ? element.parent.children.filter(ts.isJsxText).map((child) => child.text.trim()).filter(Boolean).join(" ") : "";
        inventory.uiActions.push({ event: node.name.getText(source), label, handler: node.initializer?.getText(source) ?? "", ...location(node) });
      }
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.text === "useMutation") {
          inventory.uiActions.push({ event: "useMutation", handler: node.arguments.map((argument) => argument.getText(source)).join(", "), ...location(node) });
        }
        if (file.startsWith("services/media-worker/") && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(source) === "app") {
          const method = node.expression.name.text;
          if (/^(get|post|put|delete|patch|head|options)$/.test(method) && ts.isStringLiteral(node.arguments[0] ?? {})) {
            inventory.endpoints.push({ method: method.toUpperCase(), path: node.arguments[0].text, handler: node.getText(source), ...location(node) });
          } else if (method === "route" && ts.isObjectLiteralExpression(node.arguments[0] ?? {})) {
            const properties = Object.fromEntries(node.arguments[0].properties.filter(ts.isPropertyAssignment).map((property) => [property.name.getText(source), property.initializer]));
            const methods = ts.isArrayLiteralExpression(properties.method ?? {}) ? properties.method.elements.map((element) => element.text) : [properties.method?.text];
            for (const item of methods) inventory.endpoints.push({ method: item, path: properties.url?.text, handler: node.getText(source), ...location(node) });
          }
        }
      }
      ts.forEachChild(node, (child) => visit(child, routeGuard));
    }
    visit(source);
    inventory.calls.push(...callsIn(source));
  }
  const functions = new Map(), tables = new Map(), views = new Map(), policies = new Map();
  for (const file of filesUnder(root, "supabase/migrations").filter((file) => file.endsWith(".sql"))) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    inventory.migrations.push({ file, sha256: crypto.createHash("sha256").update(text).digest("hex") });
    for (const statement of sqlStatements(text)) {
      const sql = removeLeadingComments(statement.sql);
      const line = text.slice(0, statement.offset + statement.sql.indexOf(sql)).split("\n").length;
      const record = { file, line, sql };
      let match;
      if ((match = sql.match(/^create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([\w]+)\s*\(/i))) {
        const open = sql.indexOf("(", match.index), end = balancedEnd(sql, open);
        const args = splitArgs(sql.slice(open + 1, end));
        const identity = `${match[1]}(${args.map((arg) => arg.replace(/\s+(?:default\s+[\s\S]*|=[\s\S]*)$/i, "").replace(/^(?:in\s+|inout\s+)?\w+\s+/i, "").trim().toLowerCase()).join(",")})`;
        const headerEnd = sql.search(/\bas\s+\$(?:[\w]*)?\$/i);
        const header = sql.slice(0, headerEnd < 0 ? end + 1 : headerEnd).trim();
        functions.set(identity, { name: match[1], identity, arguments: args, header, returns: header.slice(header.toLowerCase().indexOf("returns ") + 8).split(/\n(?:language|stable|volatile|immutable|security|set)\b/i)[0].trim(), securityDefiner: /security\s+definer/i.test(header), ...record });
      } else if ((match = sql.match(/^drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)\s*\(([^)]*)\)/i))) {
        functions.delete(`${match[1]}(${splitArgs(match[2]).map((arg) => arg.trim().toLowerCase()).join(",")})`);
      } else if ((match = sql.match(/^create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/i))) {
        tables.set(match[1], { name: match[1], definition: record, alterations: [] });
      } else if ((match = sql.match(/^alter\s+table\s+(?:if\s+exists\s+)?public\.(\w+)/i))) {
        const table = tables.get(match[1]); if (table) table.alterations.push(record);
      } else if ((match = sql.match(/^create\s+(?:or\s+replace\s+)?view\s+public\.(\w+)/i))) {
        views.set(match[1], { name: match[1], ...record });
      } else if ((match = sql.match(/^create\s+policy\s+("[^"]+"|\w+)\s+on\s+public\.(\w+)/i))) {
        policies.set(`${match[2]}:${match[1]}`, { name: match[1], table: match[2], ...record });
      } else if ((match = sql.match(/^drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+public\.(\w+)/i))) {
        policies.delete(`${match[2]}:${match[1]}`);
      }
      if (/^(?:grant|revoke|alter default privileges|do\s+\$)/i.test(sql)) inventory.sqlSecurityStatements.push(record);
    }
  }
  inventory.tables = [...tables.values()].sort((a, b) => a.name.localeCompare(b.name));
  inventory.views = [...views.values()].sort((a, b) => a.name.localeCompare(b.name));
  inventory.functions = [...functions.values()].sort((a, b) => a.identity.localeCompare(b.identity));
  inventory.policies = [...policies.values()].sort((a, b) => `${a.table}:${a.name}`.localeCompare(`${b.table}:${b.name}`));
  return inventory;
}

function markdown(inventory) {
  const link = (record) => `[${record.file}:${record.line}](../../../${record.file}#L${record.line})`;
  const safe = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  let text = "# Generated source inventory\n\nGenerated with `npm run mobile:contracts:generate`. Do not hand-edit. This is source evidence, not a claim about a live deployment.\n\n";
  text += "## Web routes\n\n| Path | Gate | Element | Source |\n|---|---|---|---|\n";
  for (const route of inventory.routes) text += `| \`${route.path}\` | ${route.guard} | ${safe(route.element)} | ${link(route)} |\n`;
  text += "\n## Feature API functions\n\nEvery exported function in a feature API module; local helpers outside API modules and UI event handlers are also in inventory.json. A TypeScript function is not an independent HTTP endpoint. Calls below include nested local callbacks; demo branches do not establish backend capability.\n\n";
  for (const api of inventory.featureApis.filter((api) => api.apiFile)) {
    text += `### ${api.name}\n\n${link(api)}\n\n\`\`\`typescript\n${api.signature}\n\`\`\`\n\n`;
    text += api.calls.length ? api.calls.map((call) => `- **${call.kind}**: \`${safe(call.target)}\``).join("\n") + "\n\n" : "Local orchestration; follow its imported helpers and callers.\n\n";
  }
  text += "## SQL functions and RPC signatures\n\nLatest checked-in definition by SQL identity; triggers/helpers and service-only functions are included deliberately. Presence here does **not** imply permission to invoke. Full bodies and grant/revoke history are in inventory.json; use the permission matrix and live catalog verification before connecting.\n\n";
  for (const rpc of inventory.functions) text += `### ${rpc.identity}\n\n${link(rpc)}\n\n\`\`\`sql\n${rpc.header}\n\`\`\`\n\n`;
  text += "## Tables and migration history\n\nCREATE plus ordered ALTER statements are retained verbatim rather than pretending a text scan is a deployed PostgreSQL catalog. They contain CHECK values, keys, defaults and nullable-field constraints.\n\n";
  for (const table of inventory.tables) {
    text += `### ${table.name}\n\n${link(table.definition)}\n\n\`\`\`sql\n${table.definition.sql}\n\`\`\`\n\n`;
    for (const alteration of table.alterations) text += `${link(alteration)}\n\n\`\`\`sql\n${alteration.sql}\n\`\`\`\n\n`;
  }
  text += "## Effective named RLS policy definitions\n\nReplays explicit CREATE/DROP POLICY statements in migration filename order. Dynamic SQL remains in sqlSecurityStatements; test against a migrated local database.\n\n";
  for (const policy of inventory.policies) text += `### ${policy.table} / ${policy.name}\n\n${link(policy)}\n\n\`\`\`sql\n${policy.sql}\n\`\`\`\n\n`;
  text += "## Views\n\n";
  for (const view of inventory.views) text += `### ${view.name}\n\n${link(view)}\n\n\`\`\`sql\n${view.sql}\n\`\`\`\n\n`;
  return text.trimEnd() + "\n";
}

export function generatedFiles(root = defaultRoot) {
  const inventory = buildInventory(root);
  return new Map([
    ["docs/mobile/contracts/inventory.json", JSON.stringify(inventory, null, 2) + "\n"],
    ["docs/mobile/contracts/source-inventory.md", markdown(inventory)],
    ["docs/mobile/contracts/models.md", "# Exact TypeScript model declarations\n\nGenerated from source; SQL constraints and RPC result shapes take precedence over web casts. See schema-map.md for Swift/Kotlin mapping and partial-card exceptions.\n\n" + inventory.models.filter((model) => model.file === "src/types/domain.ts" || model.file.startsWith("src/features/") || model.file === "src/components/audio/player-store.ts").map((model) => `## ${model.name}\n\n[${model.file}:${model.line}](../../../${model.file}#L${model.line})\n\n\`\`\`typescript\n${model.declaration}\n\`\`\`\n`).join("\n")],
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let failed = false;
  for (const [file, text] of generatedFiles()) {
    const full = path.join(defaultRoot, file);
    if (process.argv.includes("--check")) {
      if (!fs.existsSync(full) || fs.readFileSync(full, "utf8") !== text) { console.error(`Stale mobile contract inventory: ${file}`); failed = true; }
    } else { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); }
  }
  if (failed) process.exitCode = 1;
}
