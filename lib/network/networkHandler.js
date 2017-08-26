/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict';

const fabric = require("fabric-client")
const config = require("../config/networkConfig.js")
const identityHandler = require("../identity/identityHandler.js")

/**
 * @typedef {Object} Channel - channel object
 * @property {String} name - name of the channel object
 */

/** 
 * @typedef {Object} Channels - Channels object containing all the channels
 * @property {Channel[]} channels - array of channel objects
 */

/**
 * Network Handler for all the network management operations
 * @class
 */
class NetworkHandler {
    /**
     * Constructor function for network handler
     * @constructor
     */
    constructor() {
         this.client = new fabric()
         this.orderer = this.client.newOrderer(config.ORDERER_URL, null)
         this.peer = this.client.newPeer(config.ADMIN_PEER_URL, null)
         this.identity = new identityHandler()
    }

    /**
     * This method is for internal usage only.
     * Set's the appropriate state store for the current client object
     * @returns {Promise} A promise<Void>
     */
    setStateStore() {
        return new Promise(
            (resolve, reject) => {
                fabric.newDefaultKeyValueStore({"path": config.STATE_STORE})
                .then(
                    (stateStore) => {
                        this.client.setStateStore(stateStore)
                        return resolve(stateStore)
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
     * This method is for internal usage only.
     * Set's the appropriate state store for the current client object
     * @returns {Promise} A promise returning the peer admin User object in context
     */
    getAdminUserContext() {
        return new Promise(
            (resolve, reject) => {
                this.setStateStore()
                .then(
                    (stateStore) => {
                        var promise = this.client.getUserContext(this.identity.getAdminUserName())
                        if(promise !== undefined && promise !== null){
                            promise.then(
                                (result) => {
                                        return resolve(result)
                                }
                            )
                        } else {
                            this.identity.getAdminUserContext()
                            .then(
                                (user) => {
                                    return resolve(user)
                                }
                            )
                        }
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
     * Function to return the list of channels for the admin peer
     * @returns {Object}
    */
    queryChannels() {
        return this.getAdminUserContext()
        .then(
            (adminUser) => {
               return this.client.setUserContext(adminUser, false)
            }
        )
        .then(
            (result) => {
                return this.client.queryChannels(this.peer)
            }
        )        
        .then(
            (result) => {
                let object = {"channels" : []}
                for(let channel of result.channels){
                    let c = {}
                    c.name = channel.channel_id
                    object.channels.push(c)
                }

                return object
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

        /**
     * Function to return the list of channels for the admin peer
     * @returns {Object}
    */
    queryChaincodes() {
        return this.getAdminUserContext()
        .then(
            (adminUser) => {
               return this.client.setUserContext(adminUser, false)
            }
        )
        .then(
            (result) => {
                return this.client.queryInstalledChaincodes(this.peer)
            }
        )        
        .then(
            (result) => {
                return result
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

}

module.exports = NetworkHandler;