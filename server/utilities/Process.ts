import { ExecException, ExecOptions, exec, spawn as nodeSpawn } from "child_process";
import { ObjectEncodingOptions } from "fs";

export const cmd = (
  command: string,
  options?: ObjectEncodingOptions & ExecOptions,
): Promise<{ stdout: string | Buffer; stderr: string | Buffer; error: ExecException | null }> => {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      return resolve({ stdout, stderr, error });
    });
  });
};

export const spawn = (command: string): void => {
  const process = nodeSpawn(command, [], { shell: true, stdio: "inherit" });

  if (process?.stdout) {
    process.stdout.setEncoding("utf8");
    process.stdout.on("data", (stdout) => {
      console.log(stdout);
    });
  }

  if (process?.stderr) {
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (stderr) => {
      console.log(stderr);
    });
  }

  process.on("close", () => {
    // Process closed manually by developer
  });
};
