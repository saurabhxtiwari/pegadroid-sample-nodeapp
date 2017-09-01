#!/bin/sh

###########################################################
# Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
# All rights reserved
###########################################################

verbose='true'

#Check if the docker is installed
command -v docker >/dev/null 2>&1 || { echo "Could not find command docker." >&2; exit 1; }

#Check for appropriate usage
#$1 name of the container
#$2 peer directory
#$3 mspId
#$4 host
#$5 port
#$6 eventport

#Download the peer image if does not exist already
if [ ! $(docker images | grep hyperledger/fabric-peer | wc -l) -gt 0 ]; then
    # image does not exists
    # pull the image first
    docker pull hyperledger/fabric-peer:x86_64-1.0.1
fi

# In a typical prod environment, DNS provisioning should be done for the newly created org

# Stop any already running containers
if [ $(docker ps --filter expose=8051/tcp | wc -l) -gt 1 ]; then
    #get the container id
    containerId=$(docker ps --filter expose=8051/tcp | sed -n 2p | awk '{ print $1 }')
    echo $containerId
    docker stop $containerId
fi

# Start the peer container.
# -d - run the container in background
# -e env variables
# -v volume mounts
# docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

docker run \
  -d \
  -e CORE_PEER_ID=$1 \
  -e CORE_PEER_ADDRESS=$4:$5 \
  -e CORE_PEER_GOSSIP_EXTERNALENDPOINT=$4:$5 \
  -e CORE_PEER_LOCALMSPID=$3 \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/production/peer/msp \
  -e CORE_LOGGING_LEVEL=debug \
  -e CORE_PEER_TLS_ENABLED=false \
  -e CORE_PEER_GOSSIP_USELEADERELECTION=true \
  -e CORE_PEER_GOSSIP_ORGLEADER=false \
  -e CORE_PEER_PROFILE_ENABLED=true \
  --network pegadroidsamplenetwork_pegadroid-network \
  --name $1 \
  --restart=unless-stopped \
  -v $2/msp:/var/hyperledger/production/peer/msp \
  -v $2/ledgersData:/var/hyperledger/production/peer/ledgersData \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p $4:$5:$5 \
  -p $4:$6:$6 \
  hyperledger/fabric-peer:x86_64-1.0.1 \
  peer node start


# Keep polling until the container is up
counter=0
while [  $(docker ps -f name=$1 | wc -l) -lt 2 ]; do
    counter=$((counter+1))
    #Sleep for a sec if the container has not started yet
    sleep 1
    if [[ "$counter" -gt 10 ]]; then
        #Waited for more than 10 seconds already
        exit 1
    fi
done

exit 0