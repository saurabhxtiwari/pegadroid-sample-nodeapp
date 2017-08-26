/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict'

const jsonTemplater = require("json-templater")
const cryptoSuiteTemplate = require("../templates/cryptoSuite.json")

module.exports.KEYSTORE = __dirname + "/../msp/keystore"
module.exports.URL = "http://ca.pegadroid.com:7054"
module.exports.CRYPTOSUITE = jsonTemplater.object(cryptoSuiteTemplate, {})
module.exports.PEER_ADMIN_USER = "peerAdmin"
module.exports.PEER_ADMIN_SECRET = "password"