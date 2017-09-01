/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict';

var ca  = require("fabric-ca-client")
var config = require("../config/caClientConfig.js")
var user = require("fabric-ca-client/lib/User.js")
const scriptRunner = require("../utils/scriptRunner.js")
const fileUtils = require("../utils/fileUtils.js")

/**
 * @typedef {Object} RegisterUserRequest
 * @property {String} enrollmentID user unique CN to be registered
 * @property {String} enrollmentSecret user secret to be registered
 */

/**
 * IdentityHandler provides functions to register, enroll & revoke identities
 * @class 
 */
class IdentityHandler {

    /**
     * Constructor function for Identity Handler
     * @constructor  
     */
    constructor(){
        var keystore = ca.newCryptoKeyStore({"path": config.KEYSTORE})
        var cryptoSuite = ca.newCryptoSuite(config.CRYPTOSUITE)
        cryptoSuite.setCryptoKeyStore(keystore)

        //TODO add tls options here
        this.client = new ca(config.URL, null, '',  cryptoSuite)
    }

    /**
     * Use this function to register and enroll a user.
     * @param {RegisterUserRequest} request 
     */
    createUser(request) {
        var registrar = new user(config.PEER_ADMIN_USER)
        
        return this.client.enroll({"enrollmentID": config.PEER_ADMIN_USER, "enrollmentSecret":config.PEER_ADMIN_SECRET})
        .then(
            (result) => {
                return registrar.setEnrollment(result.key, result.certificate, config.PEER_ADMIN_MSPID)
            }
        )
        .then(
            (result) => {
                return this.client.register({"enrollmentID": request.enrollmentID, "enrollmentSecret": request.enrollmentSecret, "role":request.role, "affiliation":request.affiliation, "maxEnrollments":-1}, registrar)
            }
        )
        .then(
            (result) => {
                return this.client.enroll(request)
            }
        )
        .then(
            (result) => {
                return {"key": result.key, "certificate": result.certificate, "rootCertificate":result.rootCertificate};
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

    getAdminUserContext() {
        var registrar = new user(config.PEER_ADMIN_USER)
        return new Promise(
            (resolve, reject) => {
                this.client.enroll({"enrollmentID": config.PEER_ADMIN_USER, "enrollmentSecret":config.PEER_ADMIN_SECRET})
                .then(
                    (result) => {
                        return registrar.setEnrollment(result.key, result.certificate, "Org1MSP")
                        .then(
                            (pubkey) => {
                                return resolve(registrar)
                            }
                        )
                        .catch(
                            (err) => {
                                return reject(err)
                            }
                        )
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

    getAdminUserName() {
        return config.PEER_ADMIN_USER
    }

    getAdminUserMSPID() {
        return config.PEER_ADMIN_MSPID
    }

    getOrdererAdminUserName() {
        return config.ORDERER_ADMIN_USER
    }

    getOrdererAdminUserMSPID() {
        return config.ORDERER_ADMIN_MSPID
    }

    /**
     * Function to store the msp information 
     * @param {String} mspDir location of the mspDir
     * @param {String} ski subject key identifier for the private key
     * @param {String} key private key pem string
     * @param {String} signcert signcert pem string
     * @param {String} cacert root ca cert pem string
     */
    storeMSP(mspDir, ski, key, signcert, cacert) {
        return new Promise (
            (resolve, reject) => {
                return scriptRunner.exec(__dirname + "/../scripts/msp.sh", mspDir)
                .then(
                    () => {
                        let keyFileName = ski + "_sk"
                        return fileUtils.writeFile(mspDir + "/keystore/" + keyFileName, Buffer.from(key))
                    }
                )
                .then(
                    () => {
                        let signcertFileName = "cert.pem"
                        return fileUtils.writeFile(mspDir + "/signcerts/" + signcertFileName, Buffer.from(signcert))
                    }
                )
                .then(
                    () => {
                        let admincertFileName = "cert.pem"
                        return fileUtils.writeFile(mspDir + "/admincerts/" + admincertFileName, Buffer.from(signcert))
                    }
                )
                .then(
                    () => {
                        let cacertFileName = "ca-cert.pem"
                        return fileUtils.writeFile(mspDir + "/cacerts/" + cacertFileName, Buffer.from(cacert))
                    }
                )
                .then(
                    () => {
                        resolve()
                    }
                )
                .catch(
                    (error) => {
                        reject(error)
                    }
                )
            }
        )
    }
}

module.exports = IdentityHandler

