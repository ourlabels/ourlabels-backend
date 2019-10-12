#!/bin/sh
echo HERE
until nc -z -v -w 2 $POSTGRES_HOST 5432; do sleep 10; done
until nc -z -v -w 2 $MONGO_HOST 27017; do sleep 10; done
npm install
DEBUG=ourlabels:server npm run start