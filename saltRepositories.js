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

import {
    getExtensionsEnabled,
    getOutputDir,
    getSaltCacheDir,
    getSaltConfigDir,
} from "./saltConfig.js";
import { jsonc } from "jsonc";
import { join } from "path";
import { promises as fsPromises, pathExists } from "./fsplus.js";
import { makeRequest } from "./saltRequests.js";
import { outputExtension } from "./saltExtensions.js";
import lunr from "lunr";

class RepositoryError extends Error {}

//Repo Management
//Add repository to the list
async function addRepository(RepoURL) {
    let repositoryList = {};
    const repositoryURL = new URL(RepoURL);

    //Check if the repositories file exists
    if (await pathExists(`${getSaltConfigDir()}Repositories.json`)) {
        //If it does, set the repo list to it
        repositoryList = jsonc.parse(
            (
                await fsPromises.readFile(
                    `${getSaltConfigDir()}Repositories.json`
                )
            ).toString()
        );
    }
    //Get repo from URL
    let repositoryData = jsonc.parse(
        (await makeRequest(repositoryURL)).toString()
    );

    //Add URL to the repo metadata
    repositoryData.Meta.URL = RepoURL;

    let repositoryMetadata = repositoryData.Meta;
    //add repo to the repo list
    repositoryList[repositoryData.Meta.id] = repositoryMetadata;

    //write repo list to the file
    await fsPromises.writeFile(
        `${getSaltConfigDir()}Repositories.json`,
        JSON.stringify(repositoryList, null, 4)
    );
    await cacheRepos();
    return repositoryMetadata;
}

//Remove repository from the list
async function removeRepository(id) {
    if (await pathExists(`${getSaltConfigDir()}Repositories.json`)) {
        //Get the list of repositories
        let repositoryList = jsonc.parse(
            (
                await fsPromises.readFile(
                    `${getSaltConfigDir()}Repositories.json`
                )
            ).toString()
        );
        //Remove the repository from the list
        delete repositoryList[id];
        //Write the new list to the file
        await fsPromises.writeFile(
            `${getSaltConfigDir()}Repositories.json`,
            JSON.stringify(repositoryList, null, 4)
        );
    } else {
        //If the file doesn't exist, throw an error
        throw new RepositoryError("No repositories file found.");
    }
    await cacheRepos();
}

//Repository Interactions
//Get the list of repositories
async function getRepoList() {
    if (await pathExists(join(getSaltConfigDir(), "Repositories.json"))) {
        return await jsonc.parse(
            (
                await fsPromises.readFile(
                    join(getSaltConfigDir(), "Repositories.json")
                )
            ).toString()
        );
    } else {
        throw new Error("No repositories file found");
    }
}

//Get the list of items from all repositories
async function getListOfItems() {
    let RepositoryList = await getRepoList();
    if (RepositoryList == null) {
        throw new Error("No repositories found");
    }

    let RepositoryDataList = {};
    for (const RepositoryID in RepositoryList) {
        let Repository = RepositoryList[RepositoryID];
        let RepositoryURL = new URL(Repository["URL"]);
        //console.log(`Fetching repository ${RepositoryID} from ${RepositoryURL}`);
        try {
            let RepositoryData = jsonc.parse(
                (await makeRequest(RepositoryURL)).toString()
            );
            //console.log(RepositoryData);
            for (const FileId in RepositoryData.Files) {
                if (Object.hasOwnProperty.call(RepositoryData.Files, FileId)) {
                    const file = RepositoryData.Files[FileId];
                    file.id = FileId;
                    RepositoryDataList[FileId] = file;
                }
            }
        } catch (error) {
            throw new RepositoryError(
                `Failed to fetch repository: ${RepositoryURL}`
            );
        }
    }
    return RepositoryDataList;
}

//Get the list of items from a specified repository
async function getListOfItemsFromRepo(RepositoryID) {
    let RepositoryList = await getRepoList();
    //console.log(await getRepoList());
    let RepositoryDataList = {};
    let Repository = RepositoryList[RepositoryID];
    let RepositoryURL = new URL(Repository["URL"]);
    let RepositoryData = jsonc.parse(
        (await makeRequest(RepositoryURL)).toString()
    );
    //console.log(RepositoryData)
    for (const FileId in RepositoryData.Files) {
        if (Object.hasOwnProperty.call(RepositoryData.Files, FileId)) {
            const File = RepositoryData.Files[FileId];
            RepositoryDataList[FileId] = File;
        }
    }
    return RepositoryDataList;
}

//Repo Downloading
class DownloadError extends Error {}
//Download a file from a repository
async function download(
    id,
    options = {
        noExtensions: false,
    }
) {
    //Get the list of files
    let fileList = await getCachedListOfItems();

    //Get the file from the list
    let fileInfo = fileList[id];

    //Get the repository
    if (fileInfo == null) {
        console.log(`File not found: ${id}`);
        throw new DownloadError(`File not found: ${id}`);
    }

    //Get the file from the url using makeRequest
    let request = await makeRequest(
        new URL(fileInfo.URL),
        `${getOutputDir()}/${fileInfo["Filename"]}`
    );
    if (request === 1 || request === null || request === undefined) {
        return 1;
    }
    //Check if Extensions are enabled
    if (options.noExtensions || !getExtensionsEnabled) {
        await outputExtension(
            `${getOutputDir()}/${fileInfo["Filename"]}`,
            getOutputDir()
        );
    }

    //console.log("File Download Done!");
    return 0;
}

//Download a file from a repository
async function downloadURL(
    url,
    filename,
    options = {
        noExtensions: false,
    }
) {
    //Get the file from the url using makeRequest
    let request = await makeRequest(
        new URL(url),
        `${getOutputDir()}/${filename}`
    );
    if (request === 1 || request === null || request === undefined) {
        return 1;
    }
    if (!(typeof request == "number")) {
        await fsPromises.writeFile(`${getOutputDir()}/${filename}`, request);
    }

    //Check if Extensions are enabled
    if (options.noExtensions || !getExtensionsEnabled) {
        await outputExtension(`${getOutputDir()}/${filename}`, getOutputDir());
    }

    //console.log("File Download Done!");
    return 0;
}

//Repo Caching
//Cache the list of files to file
async function cacheRepos() {
    const items = await getListOfItems();
    await fsPromises.writeFile(
        join(getSaltCacheDir(), "Cached File List.json"),
        JSON.stringify(items, null, 4)
    );
    await fsPromises.writeFile(
        join(getSaltCacheDir(), "Last File List Cache.txt"),
        Math.floor(+new Date() / 1000).toString()
    );
    await cacheLunrIndex(items);
    return items;
}

//Fetch cached files
async function getCachedListOfItems() {
    if (!(await pathExists(join(getSaltCacheDir(), "Cached File List.json")))) {
        return await cacheRepos();
    }

    if (
        Math.floor(+new Date() / 1000) >
        parseInt(
            await fsPromises.readFile(
                join(getSaltCacheDir(), "Last File List Cache.txt")
            )
        ) +
            60 * 60 * 12
    ) {
        //Check if it has been 12 or more hours since last refresh
        return await cacheRepos();
    } else {
        return jsonc.parse(
            (
                await fsPromises.readFile(
                    join(getSaltCacheDir(), "Cached File List.json")
                )
            ).toString()
        );
    }
}

//Get a list of all identifiers from all repositories
async function getArrayOfItemIdentifiers() {
    return Object.keys(await getCachedListOfItems());
}

//Repo Searching
//Cache the lunr index
async function cacheLunrIndex(items) {
    const idx = await createLunrIndex(items);

    let specificPath = join(getSaltCacheDir(), "Specific/");
    if (!(await pathExists(specificPath))) {
        await fsPromises.mkdir(specificPath, { recursive: true });
    }

    let jsSpecific = join(getSaltCacheDir(), "Specific/JS/");
    if (!(await pathExists(jsSpecific))) {
        await fsPromises.mkdir(jsSpecific, { recursive: true });
    }

    await fsPromises.writeFile(
        join(jsSpecific, "Cached Lunr Index.json"),
        JSON.stringify(idx, null, 4)
    );

    await fsPromises.writeFile(
        join(jsSpecific, "Last Lunr Cache.txt"),
        Math.floor(+new Date() / 1000).toString()
    );
    return idx;
}

//Fetch cached lunr index
async function getCachedLunrIndex() {
    let jsSpecific = join(getSaltCacheDir(), "Specific/JS/");
    if (!(await pathExists(jsSpecific))) {
        await fsPromises.mkdir(jsSpecific, { recursive: true });
    }

    if (
        Math.floor(+new Date() / 1000) >
        parseInt(
            await fsPromises.readFile(join(jsSpecific, "Last Lunr Cache.txt"))
        ) +
            60 * 60 * 12
    ) {
        //Check if it has been 12 or more hours since last refresh

        return await cacheLunrIndex();
    } else {
        return lunr.Index.load(
            jsonc.parse(
                (
                    await fsPromises.readFile(
                        join(jsSpecific, "Cached Lunr Index.json")
                    )
                ).toString()
            )
        );
    }
}

//Create a Lunr index from the list of items
async function createLunrIndex(listOfItems) {
    if (listOfItems == null) {
        listOfItems = await getCachedListOfItems();
    }
    listOfItems = Object.values(listOfItems);

    let idx = lunr(function () {
        this.field("id");
        this.field("Name");
        this.field("ShortName");
        this.field("Series");
        this.field("Category");
        this.field("Developer");

        for (const item of listOfItems) {
            if (Array.isArray(item.Series)) {
                item.Series = item.Series.join(" ");
            }
            if (Array.isArray(item.Category)) {
                item.Category = item.Category.join(" ");
            }
            this.add(item);
        }
    });
    return idx;
}

//Search the Lunr index
async function search(term) {
    let idx = await getCachedLunrIndex();
    return idx.search(term);
}

export {
    addRepository,
    cacheLunrIndex,
    cacheRepos,
    createLunrIndex,
    download,
    downloadURL,
    getArrayOfItemIdentifiers,
    getCachedListOfItems,
    getCachedLunrIndex,
    getListOfItems,
    getListOfItemsFromRepo,
    getRepoList,
    removeRepository,
    search,
};
