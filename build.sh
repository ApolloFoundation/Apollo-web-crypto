#!/bin/bash
#
# if you have GreelVM installed in differnet localtion, please make symlink
if [ "{$1}" == graal ] ; then
    export GRAALVM_HOME=/usr/local/graal
    export PATH=$GRAALVM_HOME/bin:$GRAALVM_HOME/languages/js/bin:$PATH
    echo "Building using GraalVM at $GRAALVM_HONE"
#
# if you do not have yarn installed in GraalVM environment, please do
#
# sudo $GRAALVM_HOME/bin/npm install -g yarn
#
else
  echo "Building using system Node.js"
fi

yarn install
yarn build

