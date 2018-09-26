const fs = require("fs");
const spawnSync = require("child_process").spawnSync
const readChunk = require("read-chunk")
const fileType = require("file-type")
const AWS = require('aws-sdk');
AWS.config.update({
  "accessKeyId": process.env.AWS_ACCESS_KEY_S3,
  "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY_S3,
})
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', region: 'us-east-2'
});
const winston = require('winston');

function checkName(filePath, isVideo) {
  const filePathSplit = filePath.split("/");
  const filename = filePathSplit[filePathSplit.length - 1];
  const videoRegex = new RegExp(/.mp4|.mpg|.mpeg|.m4v|.ts|.avi/);
  const imageRegex = new RegExp(/.png|.jpg|.jpeg/);
  const zippedRegex = new RegExp(/.tar.gz|.tar.bz2|.tgz|.tbz2/);
  if (isVideo) {
    if (videoRegex.test(filename)) {
      return true;
    } else if (zippedRegex.test(filename)) {
      let truth = checkCompressedFiles(filePath, videoRegex);
      return truth;
    } else {
      return false;
    }
  } else {
    if (imageRegex.test(filename)) {
      return true;
    } else if (zippedRegex.test(filename)) {
      return checkCompressedFiles(filePath, imageRegex);
    } else {
      return false;
    }
  }
}

function checkCompressedFiles(filePath, regex) {
  const files = spawnSync("tar", ["-jtf", filePath]);
  const files_splitlines = files.stdout
    .toString("utf8")
    .split("\n")
    .map(file => {
      return file.trim();
    })
    .filter(file => {
      return file !== "";
    });
  const not_correct = files_splitlines.filter(file => {
    return !regex.test(file);
  });
  if (not_correct.length > 0) {
    return false;
  }
  return true;
}

function isVideoFile(path) {
  let buffer = readChunk.sync(path, 0, 4100);
  let file_type = fileType(buffer)["ext"];
  const ext_exists = ["mpg", "mp4", "m4v", "mp2", "avi", "mts"].includes(
    file_type
  );
  return ext_exists;
}

function isImageFile(path) {
  let buffer = readChunk.sync(path, 0, 4100);
  let file_type = fileType(buffer)["ext"];
  return ["jpg", "png"].includes(file_type);
}

const deleteBucket = async (keys, projectId, seqId, path) => {
  try {
    let deleteKeys = []
    for (let key of keys) {
      deleteKeys.push({
        Key: key
      })
    }
    console.log(deleteKeys)
    if (deleteKeys.length > 0) {
      let objectData = await s3.deleteObjects({ Bucket: `ourlabels-${projectId}-${seqId}`, Delete: { Objects: deleteKeys } }).promise()
      console.log("DELETE OBJECTS:", objectData)
    }
    let data = await s3.deleteBucket({ Bucket: `ourlabels-${projectId}-${seqId}` }).promise()
    console.log("DELETE:", data)
  } catch (err) {
    console.log("ERR4: ", err)
  }
}

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

function decompressContent(filePath, newDirectory, isVideo) {
  const tar_x_sync = spawnSync("tar", ["-jxvf", filePath, "-C", newDirectory]);
  const files_decompressed = tar_x_sync["output"]
    .filter(file => {
      return file != null;
    })
    .map(file => {
      let fstring = file.toString("utf8");
      if (fstring !== "" && fstring.includes("x")) {
        let f = fstring.substr(1).trim();
        return f;
      } else {
        return fstring;
      }
    })
    .filter(file => {
      return file !== "";
    });
  if (isVideo) {
    if (files_decompressed.length > 1 || files_decompressed.length === 0) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      for (let file of files_decompressed) {
        let newPath = `${newDirectory}/${file}`;
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
      }
      return null;
    }
    let newVideoPath = `${newDirectory}/${files_decompressed[0]}`;
    if (isVideoFile(newVideoPath)) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return [`${files_decompressed[0]}`];
    }
  } else {
    let files_decompressed_tested = [];
    for (let file of files_decompressed) {
      let newPath = `${newDirectory}/${file}`;
      if (isImageFile(newPath)) {
        files_decompressed_tested.push(file);
      } else {
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
      }
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return files_decompressed_tested;
  }
}

function processImage(newDirectory, filename) {
  const filePath = `${newDirectory}/${filename}`;
  let files = [];
  let images = [];
  if (/.gz|.bz2/.test(filename)) {
    files = decompressContent(filePath, newDirectory, false);
  } else {
    if (isImageFile(filePath)) {
      files = [filename];
    }
  }
  for (let file of files) {
    let newFilePath = `${newDirectory}/${file}`;
    let stat = fs.statSync(newFilePath);
    images.push({ filename: file, size: stat.size });
  }
  return images;
}

function processVideo(newDirectory, filename, seqname) {
  const filePath = `${newDirectory}/${filename}`;
  let files = [];
  if (/.gz|.bz2/.test(filename)) {
    files = decompressContent(filePath, newDirectory, true);
  } else {
    if (isVideoFile(filePath)) {
      files = [filename];
    }
  }
  const newPath = `${newDirectory}/${files[0]}`;
  const newPrefix = `${newDirectory}/${seqname}`;
  if (files != null && files.length === 1) {
    try {
      const processOptions = [
        "-i",
        newPath,
        "-r",
        "1/1",
        newPrefix + "-%05d.jpg"
      ];
      spawnSync("ffmpeg", processOptions);
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      const ls = spawnSync("ls", ["-1", newDirectory]);
      const lsString = ls.stdout.toString("utf8");
      const images = lsString
        .split("\n")
        .map(file => {
          let filename = file.trim();
          let fileStats = fs.statSync(`${newDirectory}/${filename}`);
          return { filename: filename, size: fileStats.size };
        })
        .filter(file => {
          return file.filename !== "";
        });
      return images;
    } catch (err) {
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      return [];
    }
  } else {
    // cancel the process
    fs.unlinkSync(newPath);
    return [];
  }
}

const processSeqImages = async (files, seq, newDirectory, userid, projectId) => {
  let images = [];
  for (let i = seq.begin; i <= seq.end; i += 1) {
    let processedImages = [];
    const file = files[i];
    console.log("FILE:", file)
    const filename = file.filename;
    const newPath = `${newDirectory}/${filename}`;
    fs.renameSync(file.path, newPath);
    if (seq.newVideo && checkName(newPath, seq.newVideo)) {
      // process video also handles tar gz/bz2 files
      processedImages = processVideo(newDirectory, filename, seq.newName);
    } else if (!seq.newVideo && checkName(newPath, seq.newVideo)) {
      // process images, also handles tar gz/bz2 files
      processedImages = processImage(newDirectory, filename, seq.newName);
    }
    const bucketParams = {
      Bucket: `ourlabels-${projectId}-${seq.newName}`
    }
    try {
      console.log("BUCKET:", bucketParams)
      try {
        await s3.createBucket(bucketParams).promise()
      } catch (err) {
        console.log("Already created")
      }
      for (const image of processedImages) {
        try {
          let imageFile = fs.readFileSync(`${newDirectory}/${image.filename}`)
          const fileParams = {
            Key: `${image.filename}`,
            Body: imageFile,
            Bucket: `ourlabels-${projectId}-${seq.newName}`
          }
          let data = await s3.upload(fileParams).promise()
          console.log("DATA:", data)
          images.push({
            userid: userid,
            file: image.filename,
            date: new Date(),
            size: image.size,
            classifications: []
          })
          fs.unlinkSync(`${newDirectory}/${image.filename}`)
          console.log("IMAGES:", images)
          // daily we will check if files still exist to upload
          // only delete the file if it's actually been uploaded
        } catch (err) {
          console.log("ERR2:", err)
        }
      }
    } catch (err) {
      console.log("ERR3:", err)
    }
  }
  return images;
}

function passwordMeetsCriteria(password) {
  return password.length >= 16 && password.length <= 60;
}
function organizeClassifications(boxes, divX = 2, divY = 2) {
  let boxesOrganized = [];
  for (let i = 0; i < divX * divY; i++) {
    boxesOrganized.push([]);
  }
  for (let box of boxes) {
    console.log(box)
    let rectX = Math.floor(Math.round(((box.x + box.width)/2) * divX));
    let rectY = Math.floor(Math.round(((box.y + box.height)/2) * divY)); // both are 0 based so no -1
    let boxPos = rectY * divX + rectX;
    console.log(boxPos)
    boxesOrganized[boxPos].push(box);
  }
  let continuous = [];
  for (let i = 0; i < divX * divY; i++) {
    boxesOrganized[i].sort((a, b) => {
      if (a.type_key < b.type_key) {
        return -1;
      }
      if (a.type_key > b.type_key) {
        return 1;
      }
      return 0;
    });
    continuous = continuous.concat(boxesOrganized[i]);
  }
  return continuous;
}
const generateBoxesFromBoxes = function (boxes) {
  let newBoxes = [];
  for (let box of boxes) {
    newBoxes.push({
      width: box.w,
      height: box.h,
      x: box.x,
      y: box.y,
      type_key: box.type,
      name: box.name,
      occluded: box.occluded,
      truncated: box.truncated,
      difficult: box.difficult
    });
  }
  return newBoxes;
};

function userContent(user) {
  if (user.username) {
    return {
      success: true,
      username: user.username,
      id: user.id,
      score: user.score,
      email: user.email,
      currentProject: user.current_project,
      role: user.role
    };
  }
  return {};
}

module.exports = {
  checkName,
  checkCompressedFiles,
  decompressContent,
  generateBoxesFromBoxes,
  isImageFile,
  isVideoFile,
  organizeClassifications,
  passwordMeetsCriteria,
  processImage,
  processVideo,
  processSeqImages,
  userContent,
  listAllKeys,
  deleteBucket
};
