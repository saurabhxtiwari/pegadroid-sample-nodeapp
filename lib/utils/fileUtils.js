/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict'

const fs = require("fs")

/**
 * FileUtils for IO operations
 * @class
 */
class FileUtils {

    /**
     * Function to read content of a file
     * Returns promise containing raw bytes from the file
     * @param {String} path absolute path to the file 
     * @return {Promise} raw bytes
     */
    static readFile(path) {
        return new Promise(
            (resolve, reject) => {
                try{
                    let buffer = fs.readFileSync(path)
                    resolve(buffer)
                }catch(err){
                    reject(err)
                }
            }
        )
    }

    /**
     * Function to write a buffer to a file
     * Returns an empty promise
     * @param {String} path 
     * @param {Buffer} buffer 
     */
    static writeFile(path, buffer) {
        return new Promise (
            (resolve, reject) => {
                try { 
                    fs.writeFileSync(path, buffer)
                    resolve()
                }catch(err){
                    reject(err)
                }
            }
        )
    }

    static readFileSync(path) {
        return fs.readFileSync(path)
    }

    /**
     * Delete a file
     * @param {String} path 
     */
    static deleteFile(path) {
        return new Promise (
            (resolve, reject) => {
                return fs.unlink(path)
                .then(
                    () => {
                        return resolve()
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
}

module.exports = FileUtils