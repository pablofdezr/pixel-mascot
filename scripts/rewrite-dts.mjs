// tsc rewrites "./x.ts" to "./x.js" in the emitted JavaScript but not in the
// declaration files; do the same there so every resolver finds the types.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".d.ts")) {
      const source = readFileSync(path, "utf8");
      // Both `from "./x.ts"` and inline `import("./x.ts")` types.
      const fixed = source.replace(/((?:from\s+|import\()["'])(\.{1,2}\/[^"']+)\.ts(["'])/g, "$1$2.js$3");
      if (fixed !== source) writeFileSync(path, fixed);
    }
  }
}

walk("dist");
