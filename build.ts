import { build, emptyDir } from "https://deno.land/x/dnt@0.37.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./solutions.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,

  },
  packageManager: "yarn",
  test: false,

  package: {
    // package.json properties
    name: "liqueur-solutions",
    version: Deno.args[0],
    description: "Your package.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/chadkirby/liqueur-solutions.git",
    },
    bugs: {
      url: "https://github.com/chadkirby/liqueur-solutions/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
  },
});
