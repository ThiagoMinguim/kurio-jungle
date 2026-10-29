import { execFileSync } from "node:child_process";
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
const forbidden =
  /GUIA_DO_PROJETO|MELHORIAS_SUGERIDAS|ENTREVISTA|EXERCICIOS|ROTEIRO_DE_ESTUDO|MATERIAL_PESSOAL|estudo-jungle-gaming/i;
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!tracked.length)
  throw new Error(
    "Git sem arquivos rastreados. Execute git add após revisar o conteúdo e repita a auditoria.",
  );
const violations = [];
for (const file of tracked) {
  if (forbidden.test(file)) violations.push(`Git: ${file}`);
  if (
    file !== "scripts/audit-delivery.mjs" &&
    /\.(md|html|json|js|ts|tsx|css)$/.test(file) &&
    forbidden.test(await readFile(file, "utf8"))
  )
    violations.push(`Conteúdo rastreado: ${file}`);
}
async function walk(directory) {
  const results = [];
  for (const file of await readdir(directory)) {
    const full = path.join(directory, file),
      stat = await lstat(full);
    if (stat.isSymbolicLink())
      throw new Error(`Link simbólico não permitido na entrega: ${full}`);
    if (stat.isDirectory()) results.push(...(await walk(full)));
    else results.push(full);
  }
  return results;
}
const build = await walk("dist");
for (const file of build) {
  if (forbidden.test(file)) violations.push(`Build: ${file}`);
  if (
    /\.(html|json|js|css|txt|md)$/.test(file) &&
    forbidden.test(await readFile(file, "utf8"))
  )
    violations.push(`Conteúdo do build: ${file}`);
}
if (violations.length)
  throw new Error(`Material pessoal detectado:\n${violations.join("\n")}`);
console.log(
  `Auditoria aprovada: ${tracked.length} arquivos Git e ${build.length} arquivos do build sem nomes ou marcadores de material pessoal. Inspecione também o pacote final antes de publicar.`,
);
