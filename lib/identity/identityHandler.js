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
    createUser(request){
        var registrar = new user(config.PEER_ADMIN_USER)
        
        return this.client.enroll({"enrollmentID": config.PEER_ADMIN_USER, "enrollmentSecret":config.PEER_ADMIN_SECRET})
        .then(
            (result) => {
                return registrar.setEnrollment(result.key, result.certificate, "Org1MSP")
            }
        )
        .then(
            (result) => {
                return this.client.register({"enrollmentID": request.enrollmentID, "enrollmentSecret": request.enrollmentSecret, "role":"user", "affiliation":"pegadroid.internal", "maxEnrollments":-1}, registrar)
            }
        )
        .then(
            (result) => {
                return this.client.enroll(request)
            }
        )
        .then(
            (result) => {
                return {"key": result.key.toBytes(), "certificate": result.certificate, "rootCertificate":result.rootCertificate};
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
}

module.exports = IdentityHandler

