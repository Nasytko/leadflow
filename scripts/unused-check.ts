/**
 * Dead code / unused dependency report for CI and local dev.
 * Run: npm run unused
 */
import { execSync } from "child_process";

function run(label: string, cmd: string) {
  console.log(`\n=== ${label} ===\n`);
  try {
    console.log(execSync(cmd, { encoding: "utf8", stdio: "pipe" }));
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.log(err.stderr);
    if (err.status !== undefined && err.status !== 0) {
      console.log(`(exit ${err.status} — review output above)`);
    }
  }
}

run("depcheck — unused npm dependencies", "npx depcheck --ignores=@tailwindcss/postcss,eslint-config-next,prisma,@prisma/client,tsx");
run("ts-prune — unused TypeScript exports", "npx ts-prune -p tsconfig.json -i \".next\"");
