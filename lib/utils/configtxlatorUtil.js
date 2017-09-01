/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict'

const _protocol = 'http'
const _host = '127.0.0.1'
const _port = '7059'

const _httpClient = require("http")
const fileUtils = require("../utils/fileUtils.js")
const path = require("path")
const scriptRunner = require("../utils/scriptRunner.js")

/**
 * Method to decode the configEnvelopeProtobuf in human readable format
 * This method makes a post request to the configtxlator service
 * @param {Buffer} buffer the input config buffer
 * @param {String} method the api method
 * @return {Promise} promise containing the decoded config JSON
 */
function decode(buffer, method) {
    return new Promise (
        (resolve, reject) => {
            let options = {
                method: "POST",
                hostname: _host,
                port: _port,
                path: "/protolator/decode/" + method,
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Content-Length": buffer.length
                }
            };
            
            let data = [];
            let request = _httpClient.request(
                options, response => {
                    response.on("data", chunk => data.push(chunk));
                    response.on("end", 
                    () => {
                            var payload = data.join('');
                            
                            if (!payload) {
                                reject(new Error(
                                    util.format('configtxlator request %s failed with HTTP status code %s', options.path, response.statusCode)));
                            }
                            //response should be JSON
                            var responseObj;
                            try {
                                responseObj = JSON.parse(payload);
                                return resolve(responseObj);
                            } catch (err) {
                                reject(new Error(
                                    util.format('Could not parse %s response as JSON due to error [%s]', options.path, err)));
                            }
                        }
                    )
                }
            )

            request.on("error", err => reject(err));
            request.write(buffer);
            request.end();
        }
    )
}

/**
 * Function to encode the json back to encoded proto
 * @param {Buffer} buffer 
 * @param {String} method 
 */
function encode(buffer, method) {
    return new Promise (
        (resolve, reject) => {
            let options = {
                method: "POST",
                hostname: _host,
                port: _port,
                path: "/protolator/encode/" + method,
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Content-Length": buffer.length
                }
            };
            
            let data = []
            let request = _httpClient.request(
                options, response => {
                    response.on("data", chunk => {
                        data.push(chunk)
                    });
                    response.on("end", 
                    () => {
                            try {
                                let result = Buffer.concat(data)
                                return resolve(result);
                            } catch (err) {
                                reject(new Error(
                                    util.format('Could not parse %s response as JSON due to error [%s]', options.path, err)));
                            }
                        }
                    )
                }
            )

            request.on("error", err => reject(err));
            request.write(buffer);
            request.end();
        }
    )
}

/**
 * Function to compute the difference in the original and updated config protos
 * @param {Buffer} original original config proto 
 * @param {Buffer} updated updated config proto
 * @return {Buffer} returns config diff proto
 */
function computeConfigUpdate(original, updated, channelName, peerDir) {
    return new Promise (
        (resolve, reject) => {
            return saveProtosToDisk(original, updated, channelName, peerDir)
            .then(
                () => {
                    return scriptRunner.exec(path.join(__dirname, "../scripts/configtxlator.sh"), 
                        channelName, 
                        path.join(peerDir, channelName + "-originalBuffer.proto"),
                        path.join(peerDir, channelName + "-updateBuffer.proto"),
                        _protocol,
                        _host,
                        _port,
                        peerDir
                    )
                }
            )
            .then(
                () => {
                    return fileUtils.readFile(path.join(peerDir, channelName + '-config-diff.proto'))
                }
            )
            .then(
                (buffer) => {
                    return resolve(buffer)
                }
            )
            .catch(
                (error) => {
                    return reject(error)
                }
            )
        }
    )
}

/**
 * Internal function - not supposed to be invoked externally
 */
function saveProtosToDisk(originalBuffer, updatedBuffer, channelName, peerDir) {
    return new Promise(
        (resolve, reject) => {
            return fileUtils.writeFile(path.join(peerDir, channelName + "-originalBuffer.proto"), originalBuffer)
            .then(
                () => {
                    return fileUtils.writeFile(path.join(peerDir, channelName + "-updateBuffer.proto"), updatedBuffer)
                }
            )
            .then(
                () => {
                    return resolve()
                }
            )
            .catch(
                (error) => {
                    return reject()
                }
            )
        }
    )
}

module.exports.encode = encode
module.exports.decode = decode
module.exports.computeConfigUpdate = computeConfigUpdate