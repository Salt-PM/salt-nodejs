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
import getStream from "get-stream";
import { PassThrough } from "stream";
import { createReadStream, createWriteStream } from "./fsplus.js";
import { getInsecureConnections, getDeviceUUID } from "./saltConfig.js";
import { lookupProtocol } from "./saltExtensions.js";

//Make a request to a source and return the body
async function makeRequest(url, file = null) {
    if (file == null) {
        return await new Promise((resolve, reject) => {
            //Convert the makeRequestStream to buffer
            let response = new Request(url);
            response.on("error", (error) => {
                reject(error);
            });
            getStream(response).then(resolve).catch(reject);
        });
    } else {
        //Make a request to the file and pipe it to the file
        let writableStream = createWriteStream(file);
        let response = new Request(url);
        response.pipe(writableStream);
    }
}

class Request extends PassThrough {
    constructor(requestURL) {
        super();

        const passThroughStream = this;

        //Make sure url is of URL type
        requestURL = requestURL.toString();
        requestURL = new URL(requestURL.replace("$SALT_UUID", getDeviceUUID()));
        switch (requestURL.protocol) {
            // HTTP
            case "http:":
            case "https:": {
                if (
                    requestURL.protocol === "http:" &&
                    !getInsecureConnections()
                ) {
                    requestURL.protocol = "https:";
                }

                if (!isBrowser) {
                    import("got").then((gotModule) => {
                        const got = gotModule.got;

                        try {
                            const response = got.stream(requestURL);
                            response.on("error", (error) =>
                                passThroughStream.emit("error", error)
                            );
                            response.pipe(passThroughStream);
                        } catch (error) {
                            this.emit(
                                "error",
                                `Request Error: Failed to fetch ${requestURL} using ${requestURL.protocol.toUpperCase()} with error: ${error}`
                            );
                        }
                    });
                } else {
                    try {
                        const streamHTTP = require("http");
                        streamHTTP.get(
                            requestURL.toString(),
                            function (response) {
                                console.log(response);
                                response.pipe(passThroughStream);
                                response.on("error", function (error) {
                                    this.emit(
                                        "error",
                                        `Request Error: Failed to fetch ${requestURL} with error: ${error}`
                                    );
                                });
                            }
                        );
                    } catch (error) {
                        this.emit(
                            "error",
                            `Request Error: Failed to fetch ${requestURL} using Browser HTTP with error: ${error}`
                        );
                        return;
                    }
                    //response.on("data", console.log);
                }
                break;
            }

            // FTP
            case "ftp:":
            case "ftps:": {
                try {
                    const { Client } = import("basic-ftp");

                    let port = 21;
                    if (requestURL.port !== "") {
                        port = requestURL.port;
                    }

                    const client = new Client();
                    //client.ftp.verbose = true;
                    client
                        .access({
                            host: requestURL.hostname,
                            port,
                            user: requestURL.username,
                            password: requestURL.password,
                            secure:
                                requestURL.protocol === "ftps:" ||
                                !getInsecureConnections(),
                        })
                        .then(() => {
                            client
                                .downloadTo(
                                    passThroughStream,
                                    requestURL.pathname.substring(1)
                                )
                                .then(client.close);
                        });
                } catch (error) {
                    this.emit(
                        "error",
                        `Request Error: Failed to fetch ${requestURL} using ${requestURL.protocol.toUpperCase()} with error: ${error}`
                    );
                }
                break;
            }

            // SFTP
            case "sftp:": {
                try {
                    const sftpClient = import("sftp-promises");
                    let port = 22;
                    if (requestURL.port !== "") {
                        port = requestURL.port;
                    }

                    let sftp = new sftpClient({
                        host: requestURL.hostname,
                        port,
                        username: requestURL.username,
                        password: requestURL.password,
                    });
                    sftp.getStream(
                        requestURL.pathname.substring(1),
                        passThroughStream
                    );
                } catch (error) {
                    this.emit(
                        "error",
                        `Request Error: Failed to fetch ${requestURL} using ${requestURL.protocol.toUpperCase()} with error: ${error}`
                    );
                }
                break;
            }
            case "file:": {
                const fileStream = createReadStream(
                    decodeURIComponent(requestURL.pathname)
                );
                fileStream.pipe(passThroughStream);
                break;
            }
            default: {
                //console.log(`URL: ${requestURL}`);
                //console.log(`URL Protocol: ${requestURL.protocol}`);
                //console.log(`Extension Handler: ${await lookupProtocol(requestURL.protocol)}`);
                //console.log(requestURL.protocol);
                lookupProtocol(requestURL.protocol).then((extensionHandler) => {
                    if (extensionHandler == null) {
                        throw new Error(
                            "No extension handler found for this protocol"
                        );
                    } else {
                        try {
                            require(extensionHandler)
                                .request(requestURL)
                                .pipe(passThroughStream);
                        } catch (error) {
                            console.log(error);
                            return null;
                        }
                    }
                });
            }
        }
    }
}

export { makeRequest, Request };
