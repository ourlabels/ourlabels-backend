const fs = require("fs");
const AWS = require('aws-sdk');
require("dotenv").config({ path: "../config/ourlabels.env" });
AWS.config.update({
  "accessKeyId": process.env.AWS_ACCESS_KEY_S3,
  "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY_S3,
})
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', region: 'us-east-2'
});
const winston = require('winston');

const listAllKeys = (token, projectId, seqId, path, accumulator, cb) => {
  var opts = { Bucket: `ourlabels-${projectId}-${seqId}` };
  if (token) opts.ContinuationToken = token;
  s3.listObjectsV2(opts, function (err, data) {
    let acc = accumulator.slice()
    acc = acc.concat(data.Contents.map((datum) => { return (datum.Key) }));
    if (data.IsTruncated)
      listAllKeys(data.NextContinuationToken, projectId, seqId, path, acc, cb);
    else
      cb(acc, projectId, seqId, path)
  });
}

const completed = (acc, projectId, seq, path) => {
  let concatPath = `${path}/${seq}`
  let seqFiles = fs.readdirSync(concatPath)
  for (let file of seqFiles) {
    if (acc.includes(file)) continue
    let filePath = `${concatPath}/${file}`
    let readFile = fs.readFileSync(filePath)
    const fileUploadParams = { Bucket: `ourlabels-${projectId}-${seq}`, Key: `${file}`, Body: readFile }
    s3.upload(fileUploadParams, (err, data) => {
      console.log(data)
    })
  }
}

const projectId = 12
let path = `./uploads/${projectId}`
let projSequences = fs.readdirSync(path)
for (let seq of projSequences) {
  if (seq[0] === '.') continue
  const bucketParams = { Bucket: `ourlabels-${projectId}-${seq}` }
  s3.createBucket(bucketParams, (err, data) => {
    listAllKeys(null, projectId, seq, path, [], completed)
  })
}