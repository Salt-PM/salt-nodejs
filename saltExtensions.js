/*   _____________________________________________________________________________________
	|........______________..........______...........__..............______________......|
	|......./  __________  \......../  __  \.........|  |............|              |.....|
	|....../  /         /__/......./  /  \  \........|  |............|_____    _____|.....|
	|...../  /             ......./  /    \  \.......|  |..................|  |...........|
	|.....\  \___________ ......./  /______\  \......|  |..................|  |...........|
	|......\___________  \....../  __________  \.....|  |..................|  |...........|
	|......__          \  \..../  /          \  \....|  |..................|  |...........|
	|...../  /_________/  /.../  /            \  \...|  |_________.........|  |...........|
	|.....\______________/.../__/              \__\..|____________|........|__|...........|
	|_____________________________________________________________________________________|

	Copyright (c) 2021-2022 meponder

	Licensed under the MIT license:

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

import { basename, dirname, join, parse } from "path";
import { getSaltExtensionDir } from "./saltConfig.js";
import { jsonc } from "jsonc";
import { promises as fsPromises } from "./fsplus.js";
import glob from "glob";

//Extensions
//Get the list of extensions
async function getExtensions() {
    //Get the list of extensions
    let extensions = await fsPromises.readdir(`${getSaltExtensionDir()}`);

    let extensionList = {};

    //Loop through the extensions
    for (const extension of extensions) {
        //If the extension is a directory, check if the protocol is supported
        if (
            (
                await fsPromises.lstat(`${getSaltExtensionDir()}${extension}`)
            ).isDirectory()
        ) {
            //Get the metadata file
            let extensionMetadata = jsonc.parse(
                (
                    await fsPromises.readFile(
                        `${getSaltExtensionDir()}${extension}/package.json`
                    )
                ).toString()
            );
            let saltMeta = {};
            saltMeta.name =
                extensionMetadata.salt.name ||
                extensionMetadata.name ||
                extension;
            saltMeta.displayName =
                extensionMetadata.salt.displayName ||
                extensionMetadata.displayName ||
                extensionMetadata.name;
            saltMeta.description = extensionMetadata.description;
            saltMeta.version = extensionMetadata.version;
            saltMeta.author = extensionMetadata.author;
            saltMeta.url = extensionMetadata.url;
            saltMeta.handler =
                extensionMetadata.salt.handler || extensionMetadata.main;
            saltMeta.types = extensionMetadata.salt.types;
            saltMeta.downloadProtocols =
                extensionMetadata.salt.downloadProtocols;
            saltMeta.fileExtensions = extensionMetadata.salt.fileExtensions;
            saltMeta.folderFiles = extensionMetadata.salt.folderFiles;
            extensionList[extension] = saltMeta;
        }
    }

    return extensionList;
}

//Lookup the extension handler for a given protocol
async function lookupProtocol(protocol) {
    //Get the list of extensions
    let Extensions = await getExtensions();

    //Loop through the extensions to find the one that handles the protocol
    for (const Extension in Extensions) {
        if (Object.hasOwnProperty.call(Extensions, Extension)) {
            const ExtensionMetadata = Extensions[Extension];
            if (ExtensionMetadata.downloadProtocols != null) {
                for (const downloadProtocol of ExtensionMetadata.downloadProtocols) {
                    if (downloadProtocol === protocol) {
                        return `${getSaltExtensionDir()}${Extension}/${
                            ExtensionMetadata["handler"]
                        }`;
                    }
                }
            }
        }
    }
}

//Lookup the extension handler for a given file extension
async function lookupFileExtension(fileExtension) {
    if (fileExtension.startsWith(".")) {
        fileExtension = fileExtension.slice(1);
    }

    //Get the list of extensions
    const Extensions = await getExtensions();

    //Loop through the extensions to find the one that handles the protocol
    for (const Extension in Extensions) {
        if (Object.hasOwnProperty.call(Extensions, Extension)) {
            const ExtensionMetadata = Extensions[Extension];
            if (
                ExtensionMetadata.fileExtensions !== null ||
                ExtensionMetadata.folderFiles !== null
            ) {
                if (ExtensionMetadata.fileExtensions.includes(fileExtension)) {
                    return `${getSaltExtensionDir()}${Extension}/${
                        ExtensionMetadata.handler
                    }`;
                }
            }
        }
    }
    return undefined;
}

//Lookup the extension handler for a given path to a folder
async function lookupFolderHandler(folderPath) {
    let supportingExtension = null;

    //Get the list of extensions
    const Extensions = await getExtensions();

    //Loop through the extensions to find the one that handles the protocol
    for (const Extension in Extensions) {
        if (Object.hasOwnProperty.call(Extensions, Extension)) {
            const ExtensionMetadata = Extensions[Extension];
            if (typeof ExtensionMetadata.folderFiles == "object") {
                for (const requiredFileGroup of ExtensionMetadata.folderFiles) {
                    try {
                        for (const requiredFile of requiredFileGroup) {
                            let globPromise = new Promise((resolve) => {
                                glob(
                                    `${folderPath}/${requiredFile}`,
                                    (er, files) => {
                                        resolve(files);
                                    }
                                );
                            });
                            let files = await globPromise;

                            if (files === []) {
                                throw new Error("No files found");
                            }
                        }
                        supportingExtension = `${getSaltExtensionDir()}${Extension}/${
                            ExtensionMetadata["handler"]
                        }`;
                    } catch (err) {
                        //Blank
                    }
                }
            }
        }
    }

    return supportingExtension;
}

//Get the extension handler for a given file or folder
async function outputExtension(input, output) {
    const { NodeVM } = require("vm2");
    let outputs;
    let currentInputs = [input];

    while (currentInputs.length > 0) {
        let currentInput = currentInputs.pop();
        let fileStats = await fsPromises.lstat(currentInput);
        let outputFiles = [];
        if (fileStats.isFile()) {
            let extensionHandler = await lookupFileExtension(
                parse(currentInput).ext
            );
            if (extensionHandler != null) {
                extensionHandler = extensionHandler.replace(/\\/g, "/");
                const vm = new NodeVM({
                    console: "inherit",
                    nesting: true,
                    wrapper: "none",
                    require: {
                        builtin: ["*"],
                        external: true,
                        //root: extensionHandler
                    },
                });
                outputFiles = await vm.run(
                    `return require("./${basename(
                        extensionHandler
                    )}").handleFile("${currentInput}", "${output}");`,
                    `${dirname(extensionHandler)}/load.js`
                );
            }
        } else if (fileStats.isDirectory()) {
            let extensionHandler = await lookupFolderHandler(currentInput);
            if (extensionHandler != null) {
                extensionHandler.replace(/\\/g, "/");
                const vm = new NodeVM({
                    console: "redirect",
                    nesting: true,
                    require: {
                        builtin: ["*"],
                        external: true,
                    },
                });

                outputFiles = vm.run(
                    `return require("${extensionHandler}").handleFolder("${currentInput}", "${output}");`,
                    `${dirname(extensionHandler)}/saltLoader.js`
                );
            }
        }
        for (const outputFile of outputFiles) {
            let outputFileStats = await fsPromises.lstat(outputFile);
            if (outputFileStats.isFile()) {
                let extensionHandler = await lookupFileExtension(
                    parse(currentInput).ext
                );
                if (extensionHandler != null) {
                    currentInputs.push(outputFile);
                } else {
                    outputs.push(outputFile);
                }
            } else if (outputFileStats.isDirectory()) {
                let extensionHandler = await lookupFolderHandler(outputFile);
                if (extensionHandler != null) {
                    currentInputs.push(outputFile);
                } else {
                    outputs.push(outputFile);
                }
            }
        }
    }
    return outputs;
}

//Install an extension from .saltextension using tar
async function installExtension(compressedExtensionPath) {
    const { extract } = import("tar");
    return await extract({
        C: getSaltExtensionDir(),
        f: compressedExtensionPath,
    });
}

//Remove an extension from extension name
async function removeExtension(extensionName) {
    return await fsPromises.rm(join(getSaltExtensionDir(), extensionName), {
        recursive: true,
    });
}

export {
    getExtensions,
    lookupProtocol,
    lookupFileExtension,
    lookupFolderHandler,
    outputExtension,
    installExtension,
    removeExtension,
};
