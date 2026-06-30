// Génère index.html à partir des meta.json présents dans outils/*/
// Aucune dépendance externe — Node natif (fs/path) suffit.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outilsDir = path.join(root, "outils");

if (!fs.existsSync(outilsDir)) {
  console.error("Dossier outils/ introuvable.");
  process.exit(1);
}

const folders = fs
  .readdirSync(outilsDir)
  .filter((f) => fs.statSync(path.join(outilsDir, f)).isDirectory());

const tools = [];

for (const folder of folders) {
  const metaPath = path.join(outilsDir, folder, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.warn(`⚠️  ${folder}/meta.json manquant — ignoré.`);
    continue;
  }
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    if (!meta.title) {
      console.warn(`⚠️  ${folder}/meta.json sans "title" — ignoré.`);
      continue;
    }
    tools.push({ ...meta, slug: folder });
  } catch (e) {
    console.warn(`⚠️  ${folder}/meta.json invalide (${e.message}) — ignoré.`);
  }
}

// Tri : "order" croissant si défini, puis alphabétique sur le titre
tools.sort((a, b) => {
  const oa = a.order ?? 99;
  const ob = b.order ?? 99;
  if (oa !== ob) return oa - ob;
  return a.title.localeCompare(b.title, "fr");
});

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const cardsHtml = tools
  .map((t) => {
    const tagsHtml = (t.tags || [])
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
    return `      <a class="card" href="outils/${t.slug}/">
        <div class="card-icon">${t.emoji || "🔧"}</div>
        <h3>${escapeHtml(t.title)}</h3>
        <p>${escapeHtml(t.description || "")}</p>
        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
      </a>`;
  })
  .join("\n");

const templatePath = path.join(root, "index.template.html");
const template = fs.readFileSync(templatePath, "utf-8");
const output = template
  .replace("<!-- TOOLS_GRID -->", cardsHtml)
  .replace("<!-- TOOLS_COUNT -->", String(tools.length))
  .replace(
    "<!-- LAST_UPDATE -->",
    new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

fs.writeFileSync(path.join(root, "index.html"), output);
console.log(`✅ index.html généré avec ${tools.length} outil(s).`);
