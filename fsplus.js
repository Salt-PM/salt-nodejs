import * as fs from "fs";
import { promisify } from "util";
import { isBrowser } from "browser-or-node";
import { Readable, Writable } from "stream";

const pathExistsSync = fs.existsSync;

function removeSync(path) {
    if (fs.lstatSync(path).isDirectory()) {
        fs.rmdirSync(path, { recursive: true });
    } else {
        fs.unlinkSync(path);
    }
}

let promises = {};
if (isBrowser) {
    promises.readFile = promisify(fs.readFile);
    promises.writeFile = promisify(fs.writeFile);
    promises.mkdir = promisify(fs.mkdir);
    promises.open = promisify(fs.open);
    promises.readdir = promisify(fs.readdir);
    promises.stat = promisify(fs.stat);
    promises.lstat = promisify(fs.lstat);
    promises.rmdir = promisify(fs.rmdir);
    promises.unlink = promisify(fs.unlink);
    promises.access = promisify(fs.access);
} else {
    promises = fs.promises;
}

async function pathExists(path) {
    try {
        await promises.lstat(path);
        return true;
    } catch (e) {
        return false;
    }
}
promises.pathExists = pathExists;

async function remove(path) {
    if ((await promises.lstat()).isDirectory()) {
        await promises.rmdir(path, { recursive: true });
    } else {
        await promises.unlink(path);
    }
}

let createWriteStream;
if (isBrowser) {
    createWriteStream = (filePath) => {
        console.log(filePath);
        let fsOpen = fs.openSync(filePath, "a");
        let fsCWS = new Writable({
            write: (data, enc, next) => {
                fs.writeSync(fsOpen, data, 0, data.length, null);
                next();
            },
            final: (next) => {
                fs.closeSync(fsOpen);
                next();
            },
        });

        return fsCWS;
    };
} else {
    createWriteStream = fs.createWriteStream;
}

let createReadStream;
if (isBrowser) {
    createReadStream = (filePath) => {
        console.log(filePath);
        let fsCWS = new Readable({
            read: () => {
                fs.promises.readFile(filePath, "utf8").then((data) => {
                    fsCWS.push(data);
                    fsCWS.push(null);
                });
            },
        });

        return fsCWS;
    };
} else {
    createReadStream = fs.createReadStream;
}

export * from "fs";
export {
    createReadStream,
    createWriteStream,
    pathExists,
    pathExistsSync,
    promises,
    remove,
    removeSync,
};
