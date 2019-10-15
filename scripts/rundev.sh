#!/bin/sh
echo HERE
until nc -z -v -w 2 $POSTGRES_HOST 5432; do sleep 10; done
until nc -z -v -w 2 $MONGO_HOST 27017; do sleep 10; done
npm install
npx sequelize-cli db:migrate --config ../config/config.json
npx sequelize-cli db:seed:all --config ../config/config.json
npm run start