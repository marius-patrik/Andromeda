import path from "node:path";
import fs from "node:fs";

function resolveWindowsCommand(command: string, env: Record<string, string | undefined>): string {
  if (path.isAbsolute(command)) return command;
  const pathValue = env.PATH ?? env.Path ?? process.env.PATH ?? "";
  const extensions = path.extname(command)
    ? [""]
    : (env.PATHEXT ?? process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";");
  for (const directory of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension.toLowerCase()}`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      const originalCase = path.join(directory, `${command}${extension}`);
      if (originalCase !== candidate && fs.existsSync(originalCase) && fs.statSync(originalCase).isFile()) return originalCase;
    }
  }
  return Bun.which(command, { PATH: pathValue }) ?? command;
}

export function commandInvocation(
  command: string,
  args: string[],
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
): string[] {
  const resolved =
    platform === "win32"
      ? resolveWindowsCommand(command, env)
      : path.isAbsolute(command)
        ? command
        : Bun.which(command, { PATH: env.PATH }) ?? command;
  if (platform === "win32" && /\.(?:cmd|bat)$/i.test(resolved)) {
    return ["cmd.exe", "/d", "/s", "/c", resolved, ...args];
  }
  return [resolved, ...args];
}
