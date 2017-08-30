/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

module.exports.ORDERER_URL = "grpc://ca.pegadroid.com:7050"
module.exports.ADMIN_PEER_URL = "grpc://peer.pegadroid.com:7051"
module.exports.STATE_STORE = __dirname + "/../msp/statestore"

module.exports.CHANNEL_ORDERER_GENESIS_PROFILE = "OrdererGenesis"
module.exports.CHANNEL_SYSTEM_PROFILE = "SystemChannel"
module.exports.CHANNEL_ANCHOR_PEER_ORG = "Org1MSP"
module.exports.CHANNEL_CONFIGTX_YAML_DIR = "/home/saurabhtiwari/projects/src/pegadroid-sample-network"
module.exports.CHANNEL_ARTIFACTS_DIR = __dirname + "/../artifacts"

module.exports.CHANNEL_ANCHOR_PEER_SIGNING_KEY_PEM = __dirname + "/../msp/adminSigningIdentity/key.pem"
module.exports.CHANNEL_ANCHOR_PEER_SIGNING_CERT_PEM = __dirname + "/../msp/adminSigningIdentity/cert.pem"

//chaincode_path if golang chaincode should be a directory under $GOPATH/src
module.exports.CHAINCODE_PATH = "pegadroid-sample-chaincode"