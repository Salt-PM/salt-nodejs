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

import { isBrowser } from "browser-or-node";
import { jsonc } from "jsonc";
import { join } from "path";
import {
    pathExistsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
} from "./fsplus.js";
import { v4 as uuidV4 } from "uuid";

//Static Directories
//Get salt directory
function getSaltDir() {
    let saltDir =
        (process.env.APPDATA ||
            (process.platform === "darwin"
                ? process.env.HOME + "/Library"
                : isBrowser
                    ? "/"
                    : process.env.HOME + "/.local/share")) + "/Salt/";
    if (!pathExistsSync(saltDir)) {
        mkdirSync(saltDir, {
            recursive: true,
        });
    }
    return saltDir;
}

//Fet the config directory
function getSaltConfigDir() {
    let saltConfigDir = getSaltDir() + "Config/";
    if (!pathExistsSync(saltConfigDir)) {
        mkdirSync(saltConfigDir, {
            recursive: true,
        });
    }
    return saltConfigDir;
}

//Get the caching directory
function getSaltCacheDir() {
    let saltCacheDir = getSaltDir() + "Cache/";
    if (!pathExistsSync(saltCacheDir)) {
        mkdirSync(saltCacheDir, {
            recursive: true,
        });
    }
    return saltCacheDir;
}

//Get the extension directory
function getSaltExtensionDir() {
    let saltExtensionDir = getSaltDir() + "Extensions/";
    if (!pathExistsSync(saltExtensionDir)) {
        mkdirSync(saltExtensionDir, {
            recursive: true,
        });
    }
    return saltExtensionDir;
}

//Config
//Get the Output Directory
function getOutputDir() {
    if (isBrowser) {
        if (!pathExistsSync("/Downloads/")) {
            mkdirSync("/Downloads/");
        }
        return "/Downloads/";
    } else {
        let saltConfigFile = `${getSaltConfigDir()}Settings.json`;

        if (!pathExistsSync(`${getSaltConfigDir()}Settings.json`)) {
            console.error("Settings file not found");
        }
        let saltConfigFileData = jsonc.parse(
            readFileSync(saltConfigFile).toString()
        );
        return saltConfigFileData.output;
    }
}

//Set the Output Directory
function setOutputDir(newOutputDir) {
    let saltConfigFile = `${getSaltConfigDir()}Settings.json`;
    let saltConfigFileData = {};
    if (pathExistsSync(saltConfigFile)) {
        saltConfigFileData = jsonc.parse(
            readFileSync(saltConfigFile).toString()
        );
    }
    saltConfigFileData.output = newOutputDir.replace(/\\/g, "/");

    return writeFileSync(
        saltConfigFile,
        JSON.stringify(saltConfigFileData, null, 4)
    );
}

//Check if insecure protocols are allowed
function getInsecureConnections() {
    let saltConfigFile = `${getSaltConfigDir()}Settings.json`;

    if (!pathExistsSync(`${getSaltConfigDir()}Settings.json`)) {
        console.error("Settings file not found");
    }
    let saltConfigFileData = jsonc.parse(
        readFileSync(saltConfigFile).toString()
    );
    return saltConfigFileData.allowInsecureConnections;
}

//Set insecure protocols option
function setInsecureConnections(newInsecureConnections) {
    let saltConfigFile = `${getSaltConfigDir()}Settings.json`;
    let saltConfigFileData = {};
    if (pathExistsSync(saltConfigFile)) {
        saltConfigFileData = jsonc.parse(
            readFileSync(saltConfigFile).toString()
        );
    }
    saltConfigFileData.allowInsecureConnections = newInsecureConnections;

    return writeFileSync(
        saltConfigFile,
        JSON.stringify(saltConfigFileData, null, 4)
    );
}

//Check if extensions are enabled
function getExtensionsEnabled() {
    let saltConfigFile = `${getSaltConfigDir()}Settings.json`;

    if (!pathExistsSync(`${getSaltConfigDir()}Settings.json`)) {
        console.error("Settings file not found");
    }
    let saltConfigFileData = jsonc.parse(
        readFileSync(saltConfigFile).toString()
    );
    return saltConfigFileData.extensionsEnabled;
}

//Set extensions enabled
function setExtensionsEnabled(newExtensionsEnabled) {
    let saltConfigFile = `${getSaltConfigDir()}Settings.json`;
    let saltConfigFileData = {};
    if (pathExistsSync(saltConfigFile)) {
        saltConfigFileData = jsonc.parse(
            readFileSync(saltConfigFile).toString()
        );
    }
    saltConfigFileData.extensionsEnabled = newExtensionsEnabled;

    return writeFileSync(
        saltConfigFile,
        JSON.stringify(saltConfigFileData, null, 4)
    );
}

// Package authentication
// Get current device UUID
function getDeviceUUID() {
    if (!pathExistsSync(join(getSaltConfigDir(), "User.json"))) {
        let userObject = {};
        userObject.uuid = uuidV4();
        writeFileSync(
            join(getSaltConfigDir(), "User.json"),
            jsonc.stringify(userObject)
        );
    }
    let uuidObject = jsonc.parse(
        readFileSync(join(getSaltConfigDir(), "User.json")).toString()
    ).uuid;
    return uuidObject;
}

export {
    getSaltDir,
    getSaltConfigDir,
    getSaltCacheDir,
    getSaltExtensionDir,
    getOutputDir,
    setOutputDir,
    getInsecureConnections,
    setInsecureConnections,
    getExtensionsEnabled,
    setExtensionsEnabled,
    getDeviceUUID,
};
