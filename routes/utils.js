const fs = require("fs");
const spawnSync = require("child_process").spawnSync;
const readChunk = require("read-chunk");
const fileType = require("file-type");
const moment = require("moment");
const AWS = require("aws-sdk");
var sizeOf = require("image-size");
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_S3,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_S3
});
const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "us-east-2"
});
const winston = require("winston");

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
  const ext_exists = ["mpg", "mp4", "m4v", "mp2", "avi", "mts", "m2v"].includes(
    file_type
  );
  return ext_exists;
}

function isImageFile(path) {
  let buffer = readChunk.sync(path, 0, 4100);
  let file_type = fileType(buffer)["ext"];
  return ["jpg", "png"].includes(file_type);
}
const checkBucketExists = async bucketOptions => {
  try {
    await s3.headBucket(bucketOptions).promise();
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    }
    throw err;
  }
};
const deleteBucket = async (keys, projectId, seqId, path) => {
  try {
    const deleteKeys = keys.map((key, i, arr) => {
      return { Key: key };
    });
    if (deleteKeys.length > 0) {
      let objectData = await s3
        .deleteObjects({
          Bucket: `ourlabels-${projectId}-${seqId}`,
          Delete: { Objects: deleteKeys }
        })
        .promise();
      winston.log("error", `DELETED: ${objectData.length} objects`);
    }
    let bucketOptions = { Bucket: `ourlabels-${projectId}-${seqId}` };
    const exists = await checkBucketExists(bucketOptions);
    if (exists) {
      let data = await s3.deleteBucket(bucketOptions).promise();
      winston.log("error", "DELETE:" + data.length);
    } else {
      console.log("CANNOT DELETE:", bucketOptions);
    }
  } catch (err) {
    console.log("ERR4: ", err);
  }
};

const listAllKeys = (token, projectId, seqId, path, accumulator, cb) => {
  var opts = { Bucket: `ourlabels-${projectId}-${seqId}` };
  if (token) opts.ContinuationToken = token;
  s3.listObjectsV2(opts, function(err, data) {
    if (err) {
      // no keys? or no bucket
      cb([], projectId, seqId, path);
    } else {
      // some keys
      let acc = accumulator.slice();
      acc = acc.concat(
        data.Contents.map(datum => {
          return datum.Key;
        })
      );
      if (data.IsTruncated)
        listAllKeys(
          data.NextContinuationToken,
          projectId,
          seqId,
          path,
          acc,
          cb
        );
      else cb(acc, projectId, seqId, path);
    }
  });
};

function decompressContent(filePath, newDirectory, isVideo, mimetype) {
  winston.log(
    "error",
    "line 145: fpath: " + filePath + " mime:",
    mimetype + " newDir:" + newDirectory
  );
  if (mimetype === "application/gzip") {
    winston.log("error", "in tar");
    try {
      try {
        const taroutput = spawnSync(
          "tar",
          ["-xzf", filePath, "-C", newDirectory, "--xform='s#.*/##x'"],
          { shell: true }
        );
        if (taroutput.status !== 0) {
          winston.log("error", "not tar");
          throw "Could not decompress with tar";
        }
      } catch (tarError) {
        winston.log("error", "ERROR in tar");
        try {
          const gunzipoutput = spawnSync("gunzip", [filePath]);
          if (gunzipoutput.status !== 0) {
            winston.log("Could not decompress archive");
            throw "Could not decompress archive";
          }
        } catch (gzError) {
          throw gzError;
        }
      }
    } catch (allError) {
      winston.log("error", "Got all error in gunzip:" + allError);
      // Was gzip file but cannot decompress!
      if (fs.existsSync(newDirectory)) {
        spawnSync("rm", ["-rf", newDirectory]);
      }
      return null;
    }
  } else if (mimetype === "application/bzip2") {
    try {
      try {
        const taroutput = spawnSync(
          "tar",
          ["-xjf", filePath, "-C", newDirectory, "--xform='s#.*/##x'"],
          { shell: true }
        );
        if (taroutput.status !== 0) {
          throw "Could not decompress with tar";
        }
      } catch (tarError) {
        try {
          const bzoutput = spawnSync("bunzip2", [filePath]);
          if (bzoutput.status !== 0) {
            throw "Could not decompress archive";
          }
        } catch (bzError) {
          throw bzError;
        }
      }
    } catch (allError) {
      winston.log("error", "Got all error in bunzip2:" + allError);
      // Was bzip2 archive but cannot decompress!
      if (fs.existsSync(newDirectory)) {
        spawnSync("rm", ["-rf", newDirectory]);
      }
      return null;
    }
  }
  const ls_output = spawnSync("ls", ["-1", newDirectory]);
  if (ls_output.status !== 0) {
    if (fs.existsSync(newDirectory)) {
      winston.log("error", "Error in ls on line 214");
      spawnSync("rm", ["-rf", newDirectory]);
    }
    return null;
  }
  const files_decompressed = ls_output.output
    .toString("utf8")
    .replace(",", "")
    .split("\n")
    .filter(file => {
      return (
        file != "" &&
        file != "," &&
        !file.endsWith("gz") &&
        !file.endsWith("bz2")
      );
    });
  winston.log(
    "error",
    "FILES EXIST FROM LS:",
    JSON.stringify(files_decompressed)
  );
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
      winston.log("error", "found view at:" + newVideoPath);
      return [files_decompressed[0]];
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
const convertToHMS = secs => {
  return (
    moment()
      .startOf("day")
      .seconds(secs)
      .format("H:mm:ss") + ".0"
  );
};

const convertToMod = everyN => {
  return `"select=not(mod(n\\,${everyN}))"`;
};

function processVideo(
  newDirectory,
  filename,
  seqname,
  mimetype,
  beginS,
  lengthS,
  everyNFrames
) {
  const filePath = `${newDirectory}/${filename}`;
  let files = [];
  if (/.gz|.bz2|gzip|bzip2$/.test(filename)) {
    files = decompressContent(filePath, newDirectory, true, mimetype);
  } else {
    if (isVideoFile(filePath)) {
      files = [filename];
    }
  }
  const newPath = `${newDirectory}/${files[0]}`;
  const newPrefix = `${newDirectory}/${seqname}`;
  const begin = convertToHMS(beginS);
  const length = convertToHMS(lengthS);
  const everyN = convertToMod(everyNFrames);
  winston.log("error", `FILES utils line 308: ${JSON.stringify(files)}`);
  const ls_output = spawnSync("ls", [newDirectory]);
  winston.log("error", ls_output.output.toString("utf8"));
  if (files != null && files.length === 1) {
    try {
      const processOptions = [
        "-i",
        newPath,
        "-ss",
        begin,
        "-t",
        length,
        "-vf",
        everyN,
        "-vsync",
        "vfr",
        newPrefix + "-%06d.jpg"
      ];
      const ffmpeg = spawnSync("ffmpeg", processOptions, {shell:true});
      console.log(ffmpeg.status);
      console.log(ffmpeg.output.toString("utf8"));
      const ls = spawnSync("ls", ["-1", newDirectory]);
      const lsString = ls.stdout.toString("utf8").replace(",", "");
      const images = lsString
        .split("\n")
        .filter(file => {
          return file != "" && file.endsWith("jpg")
        })
        .map(file => {
          let filename = file.trim();
          let fileStats = fs.statSync(`${newDirectory}/${filename}`);
          return { filename: filename, size: fileStats.size };
        })
        .filter(file => {
          return file.filename !== "";
        });
      winston.log("error", JSON.stringify(images));
      return images;
    } catch (err) {
      winston.log("error", "ERROR in processVideo line 355:" + err);
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      return [];
    }
  } else {
    // cancel the process
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }
    return [];
  }
}

const processSeqImages = async (
  files,
  seq,
  newDirectory,
  userid,
  projectId
) => {
  let images = [];
  for (let i = seq.begin; i <= seq.end; i += 1) {
    let processedImages = [];
    const file = files[i];
    winston.log("error", file);
    const filename = file.filename;
    const newPath = `${newDirectory}/${filename}`;
    fs.renameSync(file.path, newPath);
    if (seq.newVideo && checkName(newPath, seq.newVideo)) {
      // process video also handles tar gz/bz2 files
      processedImages = processVideo(
        newDirectory,
        filename,
        seq.newName,
        file.mimetype,
        seq.newBeginS,
        seq.newLengthS,
        seq.newEveryNFrames
      );
    } else if (!seq.newVideo && checkName(newPath, seq.newVideo)) {
      // process images, also handles tar gz/bz2 files
      processedImages = processImage(
        newDirectory,
        filename,
        seq.newName,
        file.mimetype
      );
    }
    const bucketParams = {
      Bucket: `ourlabels-${projectId}-${seq.newName}`
    };
    try {
      winston.log("error", "BUCKET:" + JSON.stringify(bucketParams));
      try {
        await s3.createBucket(bucketParams).promise();
      } catch (err) {
        console.log("Already created");
      }
      for (const image of processedImages) {
        try {
          winston.log("error", "IMAGE" + JSON.stringify(image));
          let imageFile = fs.readFileSync(`${newDirectory}/${image.filename}`);
          let fileDims = sizeOf(`${newDirectory}/${image.filename}`);
          const fileParams = {
            Key: `${image.filename}`,
            Body: imageFile,
            Bucket: `ourlabels-${projectId}-${seq.newName}`
          };
          let data = await s3.upload(fileParams).promise();
          winston.log("error", "DATA:" + JSON.stringify(data));
          images.push({
            userid: userid,
            file: image.filename,
            date: new Date(),
            size: image.size,
            pixelWidth: fileDims.width,
            pixelHeight: fileDims.height,
            classifications: []
          });
          // daily we will check if files still exist to upload
          // only delete the file if it's actually been uploaded
        } catch (err) {
          winston.log("error", `Error2: ${err}`);
        }
      }
    } catch (err) {
      winston.log("error", `Error3: ${err}`);
    }
  }
  return images;
};

function passwordMeetsCriteria(password) {
  return password.length >= 16 && password.length <= 60;
}
function organizeClassifications(boxes, divX = 2, divY = 2) {
  let boxesOrganized = [];
  for (let i = 0; i < divX * divY; i++) {
    boxesOrganized.push([]);
  }
  for (let box of boxes) {
    console.log(box);
    let rectX = Math.floor(Math.round(((box.x + box.width) / 2) * divX));
    let rectY = Math.floor(Math.round(((box.y + box.height) / 2) * divY)); // both are 0 based so no -1
    let boxPos = rectY * divX + rectX;
    console.log(boxPos);
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
const generateBoxesFromBoxes = function(boxes) {
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
