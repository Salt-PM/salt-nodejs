import { config, extensions, download, repositories } from "./salt.js";
import { Command } from "commander";
import project from "./package.json" assert { type: "json" };
const program = new Command();

program
    .name("salt")
    .description("Get specified file from your repos.")
    .version(project.version);

program
    .command("download")
    .aliases(["dl", "d", "get", "g"])
    .description("Download a file.")
    .argument("<File ID>", "The id of the file to download.")
    .option("--ne, --no-extensions", "Don't use extensions.")
    .action(async (fileID, options) => {
        let file = await download(fileID, { noExtensions: options.ne });
    });

program
    .command("list")
    .aliases(["ls", "l"])
    .description("List all files in your repos.")
    .action(async () => {
        try {
            const items = await repositories.getCachedListOfItems();
            for (const item in items) {
                if (Object.hasOwnProperty.call(items, item)) {
                    const itemData = items[item];
                    console.log(`${itemData.Name}:`);
                    console.log(`  \x1b[34m id: ${item}\x1b[0m`);
                    console.log(`  \x1b[32m url: ${itemData["URL"]}\x1b[0m`);
                }
            }
        } catch (error) {
            console.log("Listing items failed with error:" + error);
        }
    });

program
    .command("list-repo")
    .aliases(["list-repository", "listrepo", "listr", "lr"])
    .description("List all files in a repo.")
    .argument("<Repo ID>", "The id of the repo to list.")
    .action(async (repoID) => {
        const items = await repositories.getListOfItemsFromRepo(repoID);
        for (const item in items) {
            if (Object.hasOwnProperty.call(items, item)) {
                const itemData = items[item];
                console.log(`${itemData.Name}:`);
                console.log(`  \x1b[34m id: ${item}\x1b[0m`);
                console.log(`  \x1b[32m url: ${itemData["URL"]}\x1b[0m`);
            }
        }
    });

program
    .command("search")
    .aliases(["s"])
    .description("Search for files in your repos.")
    .argument("<Search Query...>", "The query to search for.")
    .action(async (searchQuery) => {
        const repo = await repositories.getCachedListOfItems();
        const idx = await repositories.search(searchQuery.join(" "));
        idx.reverse();
        for (const result of idx) {
            let file = repo[result.ref];

            console.log(`${file.Name}:`);
            console.log(`  \x1b[34m id: ${file.id}\x1b[0m`);
            console.log(`  \x1b[32m url: ${file["URL"]}\x1b[0m`);
        }
    });

program
    .command("update")
    .aliases(["u", "update-cache", "uc", "cache", "c", "cache-update", "cu"])
    .description("Update the cache of your repos.")
    .action(repositories.cacheRepos);

program
    .command("repo-list")
    .aliases(["repo", "r", "repolist", "rl", "list-repos", "listrepos"])
    .description("List all repos.")
    .action(async () => {
        const repos = await repositories.getRepoList();
        const repoNumber = Object.keys(repos).length;
        let repoWord;
        if (repoNumber == 1) {
            repoWord = "repository";
        } else {
            repoWord = "repositories";
        }
        console.log(`You have ${repoNumber} ${repoWord}.`);
        for (const repo in repos) {
            if (Object.hasOwnProperty.call(repos, repo)) {
                const repoData = repos[repo];
                console.log(`${repoData.Name}:`);
                console.log(`   \x1b[34mid: ${repo}\x1b[0m`);
                console.log(`   \x1b[32murl: ${repoData["URL"]}\x1b[0m`);
            }
        }
    });

program
    .command("repo-add")
    .aliases(["repoadd", "ra", "add-repo", "addrepo", "ar"])
    .description("Add a repo to your list of repos.")
    .argument("<Repo URL>", "The url of the repo to add.")
    .action(repositories.addRepository);

program
    .command("repo-remove")
    .aliases(["reporemove", "rr", "remove-repo", "removerepo", "rr"])
    .description("Remove a repo from your list of repos.")
    .argument("<Repo ID>", "The id of the repo to remove.")
    .action(repositories.removeRepository);

program
    .command("extension-list")
    .aliases([
        "extension",
        "extensionlist",
        "el",
        "list-extensions",
        "listextensions",
    ])
    .description("List all installed extensions.")
    .action(async () => {
        const extensions = await extensions.getExtensions();
        for (const extension in extensions) {
            if (Object.hasOwnProperty.call(extensions, extension)) {
                const extensionData = extensions[extension];
                console.log(`${extension}:`);
                if (extensionData.downloadProtocols != null) {
                    console.log("   \x1b[34mDownload Protocols:\x1b[0m");
                    for (const downloadProtocol of extensionData.downloadProtocols) {
                        console.log(
                            `       \x1b[34m${downloadProtocol}\x1b[0m`
                        );
                    }
                }
                if (extensionData.fileExtensions != null) {
                    console.log(
                        "   \x1b[32mCompatible File Extensions:\x1b[0m"
                    );
                    for (const fileExtension of extensionData.fileExtensions) {
                        console.log(`       \x1b[32m${fileExtension}\x1b[0m`);
                    }
                }
                if (extensionData.folderFiles != null) {
                    console.log("   \x1b[36mRequired RegExs:\x1b[0m");
                    for (const folderFile of extensionData.folderFiles) {
                        console.log(`       \x1b[36m${folderFile}\x1b[0m`);
                    }
                }
            }
        }
    });

program
    .command("extension-install")
    .aliases([
        "extensioninstall",
        "ei",
        "install-extension",
        "installextension",
        "ie",
    ])
    .description("Install an extension.")
    .argument("<Extension File>", "The file to install.")
    .action(async (extensionFile) => {
        await extensions.installExtension(extensionFile);
    });

program
    .command("extension-uninstall")
    .aliases([
        "extensionuninstall",
        "eu",
        "uninstall-extension",
        "uninstallextension",
        "ue",
    ])
    .description("Uninstall an extension.")
    .argument("<Extension ID>", "The id of the extension to uninstall.")
    .action(async (extensionID) => {
        await extensions.uninstallExtension(extensionID);
    });

program
    .command("config")
    .aliases(["conf"])
    .description("View or set properties in the config.")
    .argument(
        "<Config Property>",
        "The property to print or set (outputDir, insecureConnections, or extensionsEnabled)."
    )
    .argument("[Config Value]", "The value to set the property to.")
    .action(async (configProperty, configValue) => {
        if (configValue != null) {
            switch (configProperty) {
                case "outputDir":
                    config.setOutputDir(configValue);
                    break;
                case "insecureConnections":
                    if (
                        configValue == "true" ||
                        configValue == "t" ||
                        configValue == "yes" ||
                        configValue == "y"
                    ) {
                        config.setInsecureConnections(true);
                    } else {
                        config.setInsecureConnections(false);
                    }
                    break;
                case "extensionsEnabled":
                    config.setExtensionsEnabled(configValue);
                    break;
                default:
                    console.log(
                        "Invalid config property. Valid properties are: outputDir, insecureConnections, and extensionsEnabled."
                    );
                    break;
            }
        } else {
            switch (configProperty) {
                case "outputDir":
                    console.log(`outputDir: ${config.getOutputDir()}`);
                    break;
                case "insecureConnections":
                    console.log(
                        `insecureConnections: ${config.getInsecureConnections()}`
                    );
                    break;
                case "extensionsEnabled":
                    console.log(
                        `extensionsEnabled: ${config.getExtensionsEnabled()}`
                    );
                    break;
                default:
                    console.log(
                        "Invalid config property. Valid properties are: outputDir, insecureConnections, and extensionsEnabled."
                    );
                    break;
            }
        }
    });

program
    .command("get-uuid")
    .aliases(["uuid", "gu"])
    .description("Get the UUID of the current machine.")
    .action(async () => {
        const uuid = await config.getDeviceUUID();
        console.log(uuid);
    });

program.parse();
