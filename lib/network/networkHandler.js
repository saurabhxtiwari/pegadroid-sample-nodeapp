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
        // In a typical application, one should create a new instance
        // of client for every request
        // Switching user context in client instances is not recommended by HL fabric.
         this.client = new fabric()
         this.orderer = this.client.newOrderer(config.ORDERER_URL, null)
         this.peer = this.client.newPeer(config.ADMIN_PEER_URL, null)
         this.identity = new identityHandler()
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
     * Function to return the list of channels installed on the peer.
     * These chaincodes however may not have been instantiated on any channel
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
                return channel.initialize()
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

    /**
     * Function to install the chaincode on the target peers.
     * The calling user context must be othe anchor peer org admin entity
     * @param {*} peers 
     */
    installChaincode(peers, chaincodeId, chaincodeVersion) {
        var chaincodeInstallRequest = {}
        chaincodeInstallRequest.targets = peers
        chaincodeInstallRequest.chaincodePath = config.CHAINCODE_PATH
        chaincodeInstallRequest.chaincodeId = chaincodeId
        chaincodeInstallRequest.chaincodeVersion = chaincodeVersion
        chaincodeInstallRequest.chaincodeType = "golang"

        return this.setAdminSigningIdentity()
        .then (
            () => {
                return this.client.installChaincode(chaincodeInstallRequest)
            }
        )
        .then(
            (results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response &&
                        proposalResponses[0].response.status === 200) {
                        one_good = true;
                    } 
                    all_good = all_good & one_good;
                }
                if (all_good) {
                    return {"Status" : "Successfully Installed chaincode"}
                } else {
                    console.log(
                        'Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...'
                    );
                }
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        ) 
    }

    /**
     * Function to instantiate the already installed chaincode
     * @param {String} channelName 
     * @param {*} peers 
     * @param {String} chaincodeId 
     * @param {String} chaincodeVersion 
     */
    instantiateChaincode(channelName, peers, chaincodeId, chaincodeVersion) {
        var chaincodeInstantiateUpgradeRequest = {}
        chaincodeInstantiateUpgradeRequest.targets = peers
        chaincodeInstantiateUpgradeRequest.chaincodeType = "golang"
        chaincodeInstantiateUpgradeRequest.chaincodeId = chaincodeId
        chaincodeInstantiateUpgradeRequest.chaincodeVersion = chaincodeVersion
        chaincodeInstantiateUpgradeRequest.fcn = "init"
        chaincodeInstantiateUpgradeRequest.args = []

        //Optionally we can specify the endorsement policy here
        // If not specified, default is that any member of the 
        // any of the participating orgs can endorse the transaction

        var channel = this.client.newChannel(channelName)
        channel.addOrderer(this.orderer)
        return this.setAdminSigningIdentity()
        .then(
            () => {
                // initialize the channel to load the config from orderer.
                return channel.initialize()
            }
        )
        .then(
            () => {
                chaincodeInstantiateUpgradeRequest.txId = this.client.newTransactionID()
                return channel.sendInstantiateProposal(chaincodeInstantiateUpgradeRequest)
            }
        )
        .then(
            (results) => {
                if(results !== undefined && results !== null){
                    var proposalResponses = results[0];
                    var proposal = results[1];
                    var all_good = true;
                    for (var i in proposalResponses) {
                        let one_good = false;
                        if (proposalResponses && proposalResponses[0].response &&
                            proposalResponses[0].response.status === 200) {
                            one_good = true;
                        } 
                        all_good = all_good & one_good;
                    }
                    if (all_good) {
                        var transactionRequest = {
                            "proposalResponses": proposalResponses,
                            "proposal": proposal
                        };
                        
                        // Now send the instantiate transaction request to the orderer
                        return channel.sendTransaction(transactionRequest)
                    } else {
                        throw new Error(
                            'Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...'
                        );
                    }
    
                }else{
                    throw new Error("Chaincode instantiate proposal failed")
                }
            }
        )
        .then(
            (response) => {
                if (response.status === 'SUCCESS') {
                    
                    return {"Status" : "Successfully Instantiated chaincode"}
                } else {
                    throw new Error('Failed to instantiate chaincode. Error code: ' + response.status);
                }
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

    /**
     * Function to invoke a transaction on the already deployed chaincode
     * @param {String} channelName 
     * @param {*} peers 
     * @param {String} chaincodeId 
     * @param {String} chaincodeVersion 
     */
    invokeChaincode(channelName, peers, chaincodeId, chaincodeVersion) {
        var chaincodeInvokeRequest = {}
        chaincodeInvokeRequest.targets = peers
        chaincodeInvokeRequest.chaincodeId = chaincodeId
        chaincodeInvokeRequest.fcn = "createPerson"
        var input = JSON.stringify({"ID":1, "Name":"SaurabhTiwari", "Email": "saurabh.x.tiwari@gmail.com"})
        //input = input.replace(new RegExp('\"', 'g'), '\\"');

        chaincodeInvokeRequest.args = [input]

        var channel = this.client.newChannel(channelName)
        channel.addOrderer(this.orderer)
        return this.setAdminUserContext()
        .then(
            () => {
                // initialize the channel to load the config from orderer.
                return channel.initialize()
            }
        )
        .then(
            () => {
                chaincodeInvokeRequest.txId = this.client.newTransactionID()
                return channel.sendTransactionProposal(chaincodeInvokeRequest, 20000000)
            }
        )
        .then(
            (results) => {
                if(results !== undefined && results !== null){
                    var proposalResponses = results[0];
                    var proposal = results[1];
                    var all_good = true;
                    for (var i in proposalResponses) {
                        let one_good = false;
                        if (proposalResponses && proposalResponses[0].response &&
                            proposalResponses[0].response.status === 200) {
                            one_good = true;
                        } 
                        all_good = all_good & one_good;
                    }
                    if (all_good) {
                        var transactionRequest = {
                            "proposalResponses": proposalResponses,
                            "proposal": proposal
                        };
                        
                        // Now send the instantiate transaction request to the orderer
                        return channel.sendTransaction(transactionRequest)
                    } else {
                        throw new Error(
                            'Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...'
                        );
                    }
    
                }else{
                    throw new Error("Chaincode invoke proposal failed")
                }
            }
        )
        .then(
            (response) => {
                if (response.status === 'SUCCESS') {
                    return {"Status" : "Successfully executed chaincode"}
                } else {
                    throw new Error('Failed to instantiate chaincode. Error code: ' + response.status);
                }
            }
        )
        .catch(
            (error) => {
                console.log(error.message)
            }
        )
    }

    /**
     * Function to return the list of chaincodes installed on a channel
     * @param {String} channelName name of the channel
     * @returns {Object}
    */
    queryInstantiatedChaincodes(channelName) {
        // The cert and key saved in anchor peer msp directory
        // as specified in configtx.yaml file can only be used for 
        // querying chaincodes.
        // This function is not supported as of fabric 1.0.1 Node SDK.
        var channel = this.client.newChannel(channelName)
        channel.addOrderer(this.orderer)
        return this.setAdminSigningIdentity()
        .then(
            () => {
                // initialize the channel to load the config from orderer.
                return channel.initialize()
            }
        )
        .then(
            () => {
                return channel.queryInstantiatedChaincodes(this.peer)
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
     * Function to return the channel info
     * @param {String} channelName name of the channel
     * @returns {Object}
    */
    queryChannelInfo(channelName) {
        // The cert and key saved in anchor peer msp directory
        // as specified in configtx.yaml file can only be used for 
        // querying chaincodes.
        // This function is not supported as of fabric 1.0.1 Node SDK.
        var channel = this.client.newChannel(channelName)
        channel.addOrderer(this.orderer)
        return this.setAdminSigningIdentity()
        .then(
            () => {
                // initialize the channel to load the config from orderer.
                return channel.initialize()
            }
        )
        .then(
            () => {
                return channel.queryInfo(this.peer)
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

    signupNewOrg() {
        // 1) register and enroll an anchor peer for the new org and assign it a MSP ID.
        // 2) next retrieve the genesis block for the channel.
        // 3) update the desired consortiums defined inside orderer system's channel to include this new org. Also update
        // any channel creation policies for those consortiums if needed.
        // 4) Get the current config from the channel.
        // 5) update the membership in the config.
        // The new org is now ready to enroll its own peers, create channels etc.

        
        
    }

    // methods below this line are internal methods not meant for calling from outside
    
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

    /**
     * Sets the admin signing identity using the admin peer
     * cert and key files. This is needed for any channel config
     * operations, as per the policy defined in configtx.yaml
     */
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
}

module.exports = NetworkHandler;