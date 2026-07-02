import { describe, expect, test } from "bun:test";
import { parseGitmodules, serializeGitmodules } from "../src/gitmodules";

describe("gitmodules", () => {
  test("parses submodule entries", () => {
    expect(
      parseGitmodules(`[submodule "packages/skye"]
\tpath = packages/skye
\turl = https://github.com/marius-patrik/skye.git
\tbranch = main
`),
    ).toEqual([
      {
        name: "packages/skye",
        path: "packages/skye",
        url: "https://github.com/marius-patrik/skye.git",
        branch: "main",
      },
    ]);
  });

  test("serializes stable entries", () => {
    expect(
      serializeGitmodules([
        {
          name: "packages/rommie",
          path: "packages/rommie",
          url: "https://github.com/marius-patrik/andromeda.git",
          branch: "main",
        },
      ]),
    ).toBe(`[submodule "packages/rommie"]
\tpath = packages/rommie
\turl = https://github.com/marius-patrik/andromeda.git
\tbranch = main
`);
  });
});
