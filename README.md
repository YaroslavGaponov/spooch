
Info
========

Spooch is NoSQL database server with REST API in pure Node.JS


## Start

`mkdir ./db`
`./bin/spoochd start`

## Stop

`./bin/spoochd stop`

## Test REST server

`./test/test.sh`

## Check speed for disk storage

`mkdir ./lib/storage/test/db`
`node ./lib/storage/test/test.js`

## Pluggins

Spooch supports plugins.
As example, you can work with value as object or as array through build-in "_array" and "_object" plugins.
Other you can develop own plugins.

Some examples:
`./test/array.sh` or `./test/object.sh`



# Install, start, stop and uninstall 

## Install from rpm package

`rpm -ivh https://raw.github.com/YaroslavGaponov/spooch/master/installer/spooch.rpm`

## Start

`sudo spooch start`

## Stop

`sudo spooch stop`

## Uninstall from system

`rpm -e spooch`