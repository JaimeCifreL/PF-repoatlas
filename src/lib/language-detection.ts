
const EXTENSIONS: Record<string, string> = {
  // JavaScript y TypeScript
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",

  // Backend
  py: "Python",
  pyi: "Python",
  java: "Java",
  cs: "C#",
  php: "PHP",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  kt: "Kotlin",
  kts: "Kotlin",
  swift: "Swift",
  dart: "Dart",

  // C y C++
  c: "C",
  h: "C/C++",
  cc: "C++",
  cpp: "C++",
  cxx: "C++",
  hpp: "C++",
  hh: "C++",

  // Web
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",

  // Scripts y datos
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  psm1: "PowerShell",
  sql: "SQL",

  // Configuración y documentación
  json: "JSON",
  jsonc: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  ini: "INI",
  md: "Markdown",
  mdx: "MDX",
  txt: "Text",

  // Archivos adicionales
  ipynb: "Jupyter Notebook",
  graphql: "GraphQL",
  proto: "Protocol Buffers",
};

export function detectLanguage(path: string): string {
  const name = path
    .replace(/\\/g, "/")
    .split("/")
    .at(-1)
    ?.toLowerCase() ?? "";

  if (name === "dockerfile") return "Dockerfile";
  if (name === "makefile") return "Makefile";
  if (name === ".gitignore") return "Git config";
  if (name.startsWith(".env")) return "Environment config";

  const extension = name.split(".").at(-1) ?? "";

  return EXTENSIONS[extension] ?? "Unknown";
}
