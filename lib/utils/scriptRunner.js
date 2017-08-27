/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict'

const { exec } = require("child_process")

/**
 * ScriptRunner class is a helper for executing shell scripts
 * Use ScriptRunner.exec(pathToScript, ...args) method
 * @class
 */
class ScriptRunner {

    /**
     * This method only executes a shell script and returns a promise
     * containing Void or throw an error in case of failure
     * @returns {Promise}
     */
    static exec(pathToScript, ...args) {
        return new Promise(
            (resolve, reject) => {
               var command = 'sh ';
               command += pathToScript + ' '
               for(let i=0; i<args.length; ) {
                    command += args[i] + ' '
                    i++
                    command += args[i] + ' '
                    i++
               }

               var errMessage = ''
               try{
                    var script = exec(command)
                    /*script.stdout.on('data',function(data){
                        console.log(data);
                    });*/

                    script.stderr.on('data',function(data){
                        errMessage += " [ " + data + " ] "
                    })

                    script.on('close', (code) => {
                        if(code == 0)
                            return resolve()
                        else
                            return reject(new Error(errMessage))
                    });
               }catch(err){
                    return reject(new Error("Failed while loading the script " + err.message))
               }
            }
        )
    }
}

module.exports = ScriptRunner