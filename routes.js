/**
*********************************************************
Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
All rights reserved
*********************************************************
*/

'use strict';

const restify = require("restify")
const config = require("./lib/config/restifyConfig.js")
const identityHandler = require("./lib/identity/identityHandler.js")
const networkHandler = require("./lib/network/networkHandler.js")
const restifyPlugin = restify.plugins;

var server = restify.createServer({
    name : config.name,
    version: config.version
})

server.use(restifyPlugin.jsonBodyParser({ mapParams: true }))
server.use(restifyPlugin.acceptParser(server.acceptable))
server.use(restifyPlugin.queryParser({ mapParams: true }))
server.use(restifyPlugin.fullResponse())
server.pre(restify.pre.sanitizePath());

server.listen(config.port)

server.get("/createUser", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new identityHandler()
    handler.createUser({"enrollmentID": "testuser4", "enrollmentSecret":"password", "role":"user", "affiliation": "pegadroid.internal"})
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/queryChannels", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.queryChannels()
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/queryChaincodes", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.queryChaincodes()
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/queryInstantiatedChaincodes/:channelName", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.queryInstantiatedChaincodes(req.params.channelName)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/queryChannelInfo/:channelName", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.queryChannelInfo(req.params.channelName)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/createChannel/:channelName", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.createChannel(req.params.channelName)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/joinChannel/:channelName", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.joinChannel(req.params.channelName, handler.peer)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/installChaincode/:chaincodeId/:chaincodeVersion", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    var peers = []
    peers.push(handler.peer)
    handler.installChaincode(peers, req.params.chaincodeId, req.params.chaincodeVersion)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/instantiateChaincode/:channelName/:chaincodeId/:chaincodeVersion", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    var peers = []
    peers.push(handler.peer)
    handler.instantiateChaincode(req.params.channelName, peers, req.params.chaincodeId, req.params.chaincodeVersion)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/invokeChaincode/:channelName/:chaincodeId/:chaincodeVersion", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    var peers = []
    peers.push(handler.peer)
    handler.invokeChaincode(req.params.channelName, peers, req.params.chaincodeId, req.params.chaincodeVersion)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})

server.get("/signupNewOrg/:name/:secret", function(req, res, next){
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    var handler = new networkHandler()
    handler.signupNewOrg(req.params.name, req.params.secret)
    .then(
        (response) => {
            res.end(JSON.stringify(response))
            return next()
        }
    )
})