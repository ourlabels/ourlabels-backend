FROM node:10-alpine
RUN apk update && apk add netcat-openbsd wget curl alpine-sdk libffi libffi-dev zlib-dev jpeg-dev
COPY . /ourlabels-backend
WORKDIR /ourlabels-backend
RUN npm install
