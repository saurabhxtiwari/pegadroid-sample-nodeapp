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
}

module.exports = FileUtils