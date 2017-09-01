#!/bin/sh

###########################################################
# Copyright (c) 2017 Pegadroid IQ Solutions Private Limited
# All rights reserved
###########################################################

verbose='true'

#Check for correct usage of the command
if [ $# -ne 1 ] 
    then
        echo "Incorrect usage. Type sh msp.sh dirpath"
        exit 1
fi

#Check if output dir exists
if [ ! -d $1 ]; then
  mkdir -p $1
fi

# switch to the msp directory
cd $1

#Delete any already existing certs etc
rm -rf *

# create the new directories
mkdir admincerts cacerts signcerts keystore

exit 0
