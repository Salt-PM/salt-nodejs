import caxa from "caxa";
import { platform } from "os";

switch (platform()) {
    case "win32":
        (async () => {
            await caxa.default({
                input: "./",
                output: "build/salt.exe",
                command: [
                    "{{caxa}}/node_modules/.bin/node",
                    "--no-warnings",
                    "{{caxa}}/cli.js",
                ],
            });
        })();
        break;

    case "linux":
    case "darwin":
        (async () => {
            await caxa.default({
                input: "./",
                output: "build/salt",
                command: [
                    "{{caxa}}/node_modules/.bin/node",
                    "--no-warnings",
                    "{{caxa}}/cli.js",
                ],
            });
        })();
        break;
    default:
        break;
}
