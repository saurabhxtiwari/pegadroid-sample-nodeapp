#!/bin/sh

###########################################################
# Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
# All rights reserved
###########################################################

verbose='true'

#Check if the configtxgen is available in the PATH
command -v configtxlator >/dev/null 2>&1 || { echo "configtxlator is not on the path.  Please update the PATH env variable appropriately." >&2; exit 1; }

# $1 -> ChannelName
# $2 -> path to original config file
# $3 -> path to updated config file
# $4 -> configtxlator protocol
# $5 -> host
# $6 -> port
# $7 -> output dir

curl -X POST -F channel=$1 -F original=@$2 -F updated=@$3 $4://$5:$6/configtxlator/compute/update-from-configs > $7/$1-config-diff.proto
