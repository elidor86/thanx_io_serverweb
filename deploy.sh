#!/bin/bash

rsync -az /home/productionServer /home/mainProductionServer

forever stop /home/mainProductionServer/productionServer/server.js

production=true Production=true forever start -l forever.log -o out.log -e err.log -a -s /home/mainProductionServer/productionServer/server.js
