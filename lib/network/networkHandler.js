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
const scriptRunner = require("../utils/scriptRunner.js")
const fileUtils = require("../utils/fileUtils.js")

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

    /**
     * This method is for internal usage only.
     * Set's the appropriate anchor peer admin context for the current client object
     * @returns {Promise} A promise returning the peer admin User object in context
     */
    setAdminUserContext() {
        return new Promise(
            (resolve, reject) => {
                this.setStateStore()
                .then(
                    () => {
                        var promise = this.client.getUserContext(this.identity.getAdminUserName())
                        if(promise !== undefined && promise !== null){
                            return promise
                            .then(
                                (result) => {
                                    return resolve()
                                }
                            )
                        } else {
                            return this.identity.getAdminUserContext()
                            .then(
                                (user) => {
                                    return this.client.setUserContext(user, false)
                                }
                            )
                            .then(
                                (result) => {
                                    return resolve()
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

    setAdminSigningIdentity() {
        var adminSigningIdentity = {}
        adminSigningIdentity.username = this.identity.getAdminUserName()
        adminSigningIdentity.mspid = this.identity.getAdminUserMSPID()

        return new Promise(
            (resolve, reject) => {
                this.setStateStore()
                .then(
                    () => {
                        return fileUtils.readFile(config.CHANNEL_ANCHOR_PEER_SIGNING_KEY_PEM)                        
                    }
                )
                .then(
                    (keyPemBytes) => {
                        adminSigningIdentity.keyPem = Buffer.from(keyPemBytes).toString()
                        return fileUtils.readFile(config.CHANNEL_ANCHOR_PEER_SIGNING_CERT_PEM)
                    }
                )
                .then(
                    (certPemBytes) => {
                        adminSigningIdentity.certPem = Buffer.from(certPemBytes).toString()
                        return this.client.createUser({
                            "username": adminSigningIdentity.username,
                            "mspid": adminSigningIdentity.mspid,
                            "cryptoContent": {
                                "privateKeyPEM": adminSigningIdentity.keyPem,
                                "signedCertPEM": adminSigningIdentity.certPem
                            }
                        })
                    }
                )
                .then(
                    (user) => {
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

    /**
     * This method is intended for internal use only.
     * Use this to generate the channel artifacts for the purpose of creating new channels.
     * @param {String} channelName
     */
    generateArtifacts(channelName) {
        return scriptRunner.exec(__dirname + "/../scripts/artifacts.sh", 
            "-a", config.CHANNEL_ORDERER_GENESIS_PROFILE, 
            "-b", config.CHANNEL_SYSTEM_PROFILE, 
            "-c", channelName, 
            "-d", config.CHANNEL_ANCHOR_PEER_ORG, 
            "-e", config.CHANNEL_CONFIGTX_YAML_DIR, 
            "-f", config.CHANNEL_ARTIFACTS_DIR)
    }
    
    /**
     * Function to return the list of channels for the admin peer
     * @returns {Object}
    */
    queryChannels() {
        return this.setAdminUserContext()
        .then(
            () => {
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
        // The cert and key saved in anchor peer msp directory
        // as specified in configtx.yaml file can only be used for 
        // querying chaincodes.
        return this.setAdminSigningIdentity()
        .then(
            () => {
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

    /**
     * Function to create a channel as requested by the signing admin peer
     * @param {String} channelName 
     */
    createChannel(channelName) {
        // The cert and key saved in anchor peer msp directory
        // as specified in configtx.yaml file can only be used for 
        // creating new channels and inviting peers to join channels.
        // The reason being that those certs are stored inside the
        // orderer genesis block which by default defines the channel creation policy
        // as - one of the participating org admins should sign the channel creation request.
        var channelRequest = {}
        channelRequest.name = channelName
        channelRequest.orderer = this.orderer
        channelRequest.signatures = []
        return this.setAdminSigningIdentity()
        .then(
            () => {
                return this.generateArtifacts(channelName)
            }
        )
        .then(
            () => {
                return fileUtils.readFile(config.CHANNEL_ARTIFACTS_DIR + "/" + channelName + ".tx")
            }
        )
        .then(
            (configEnvelopeProtobuf) => {
                // Don't set an envelope in the request as it is causing channel creation to fail
                //channelRequest.envelope = configEnvelopeProtobuf
                return this.client.extractChannelConfig(configEnvelopeProtobuf)
            }
        )
        .then(
            (configUpdateProtobuf) => {
                channelRequest.config = configUpdateProtobuf
                return this.client.signChannelConfig(channelRequest.config) 
            }
        )
        .then(
            (configSignature) => {
                channelRequest.signatures.push(configSignature)
                channelRequest.txId = this.client.newTransactionID()
                return this.client.createChannel(channelRequest)
            }
        )
        .then(
            (response) => {
                return {"Status": "Success"};
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

    /**
     * 
     * @param {String} channelName name of the channel to be created
     * @param {*} peers array of peer object.
     */
    joinChannel(channelName, peers) {
        // The cert and key saved in anchor peer msp directory
        // as specified in configtx.yaml file can only be used for 
        // creating new channels and inviting peers to join channels.
        // The reason being that those certs are stored inside the
        // orderer genesis block which by default defines the channel creation policy
        // as - one of the participating org admins should sign the channel creation request.

        var channel = this.client.newChannel(channelName)
        channel.addOrderer(this.orderer)
        return this.setAdminSigningIdentity()
        .then(
            () => {
                // initialize the channel to load the config from orderer.
                channel.initialize()
            }
        )
        .then(
            () => {
                // Next query the genesis block for the channel to be created
                let g_request = {"txId" : this.client.newTransactionID()};
                return channel.getGenesisBlock(g_request)
            }
        ).then(
            (genesisBlock) => {
                // Next call join channel function passing the target peers
                let j_request = {
                    targets : peers,
                    block : genesisBlock,
                    txId : this.client.newTransactionID()
                };

                return channel.joinChannel(j_request)
            }
        )
        .then(
            (results) => {
                if(results && results[0].response && results[0].response.status == 200) {
                    return {"message" : "Peers joined the channel successfully"}
                  } else {
                    console.log("peers could not join the channel")
                  }
            }
        )
        .catch(
            (error) => {
                console.log(error)
            }
        )
    }
}

module.exports = NetworkHandler;