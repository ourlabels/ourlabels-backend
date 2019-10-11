#!/bin/sh
until nc -z -w 2 $POSTGRES_HOST 5432; do sleep 30; done
until nc -z -w 2 $MONGO_HOST 2717; do sleep 30; done
npm install
npm run start