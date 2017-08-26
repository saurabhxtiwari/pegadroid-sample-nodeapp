#!/bin/sh

###########################################################
# Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
# All rights reserved
###########################################################

verbose='true'

#Check if the configtxgen is available in the PATH
command -v configtxgen >/dev/null 2>&1 || { echo "configtxgen is not on the path.  Please update the PATH env variable appropriately." >&2; exit 1; }

#Check for correct usage of the command
if [ $# -eq 0 ] 
    then
        echo "Incorrect usage. Type sh artifacts.sh -h"
        exit 1
fi

while test $# -gt 0; do
    case "$1" in
        -a|--genesisProfile)
                shift
                if test $# -gt 0; then
                        export GENESIS_PROFILE=$1
                else
                        echo "No genesis profile specified"
                        exit 1
                fi
                shift
                ;;
        -b|--channelProfile)
                shift
                if test $# -gt 0; then
                        export CHANNEL_PROFILE=$1
                else
                        echo "No channel profile specified"
                        exit 1
                fi
                shift
                ;;
        -c|--channelName)
                shift
                if test $# -gt 0; then
                        export CHANNEL_NAME=$1
                else
                        echo "No channel name specified"
                        exit 1
                fi
                shift
                ;;
        -d|--asOrg)
                shift
                if test $# -gt 0; then
                        export ANCHOR_PEER_ORG=$1
                else
                        echo "No anchor peer asOrg param specified"
                        exit 1
                fi
                shift
                ;;
        -e|--configFile)
                shift
                if test $# -gt 0; then
                        export FABRIC_CFG_PATH=$1
                else
                        echo "No config file provided"
                        exit 1
                fi
                shift
                ;;
        -f|--outputDir)
                shift
                if test $# -gt 0; then
                        export OUTPUT_DIR=$1
                else
                        echo "No artifacts output dir specified"
                        exit 1
                fi
                shift
                ;;
        -h|--help|*)
                echo "options: Usage"
                echo "-h, --help                                show brief help"
                echo "-a, --genesisProfile=GenesisProfile       orderer genesis profile as mentioned in configtx.yaml"
                echo "-b, --channelProfile=ChannelProfile       system channel profile as mentioned in configtx.yaml"
                echo "-c, --channelName=ChannelName             channel name for which the artifact needs to be created"
                echo "-d, --asOrg=OrgName                       org anchor peer org name as mentioned in configtx.yaml"
                echo "-e, --configFileDir=FilePath              Parent directory of the configtx.yaml config file"
                echo "-f, --outputDir=DirectoryPath             specify a directory to store output in"
                exit 1
                ;;
    esac
done

#Check if output dir exists
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Provided artifacts output dir path does not exist"
  exit 1
fi

#check if configtx.yaml file exists
if [ ! -f $FABRIC_CFG_PATH/configtx.yaml ]; then
    echo "configtx.yaml file not found at the provided configFileDir path"
    exit 1
fi

#Create the orderer genesis block
configtxgen -profile $GENESIS_PROFILE -outputBlock ${OUTPUT_DIR}/genesis.block

#Create the channel artifact
configtxgen -profile $CHANNEL_PROFILE -channelID $CHANNEL_NAME -outputCreateChannelTx ${OUTPUT_DIR}/${CHANNEL_NAME}.tx

#Create the anchor peer artifact
configtxgen -profile $CHANNEL_PROFILE -outputAnchorPeersUpdate ${OUTPUT_DIR}/${ANCHOR_PEER_ORG}anchors.tx -channelID $CHANNEL_NAME -asOrg ${ANCHOR_PEER_ORG}

exit 0