const fs = require("fs");
const spawnSync = require("child_process").spawnSync
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

function processSeqImages(files, seq, newDirectory, userid) {
  let images = [];
  for (let i = seq.begin; i <= seq.end; i += 1) {
    let processedImages = [];
    const file = files[i];
    const filename = file.filename;
    const newPath = `${newDirectory}/${filename}`;
    fs.renameSync(file.path, newPath);
    if (seq.video && checkName(newPath, seq.video)) {
      // process video also handles tar gz/bz2 files
      processedImages = processVideo(newDirectory, filename, seq.name);
    } else if (!seq.video && checkName(newPath, seq.video)) {
      // process images, also handles tar gz/bz2 files
      processedImages = processImage(newDirectory, filename, seq.name);
    }
    for (let image of processedImages) {
      images.push({
        userid: userid,
        file: image.filename,
        date: new Date(),
        size: image.size,
        classifications: []
      });
    }
  }
  return images;
}

function emailMeetsCriteria(email) {
  return email.match(regexpEmail);
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
    let rectX = Math.floor(box.x * divX);
    let rectY = Math.floor(box.y * divY); // both are 0 based so no -1
    let boxPos = rectY * divX + rectX;
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
      current_project: user.current_project,
      role: user.role
    };
  }
  return {};
}

module.exports = {
  checkName,
  checkCompressedFiles,
  decompressContent,
  emailMeetsCriteria,
  generateBoxesFromBoxes,
  isImageFile,
  isVideoFile,
  organizeClassifications,
  passwordMeetsCriteria,
  processImage,
  processVideo,
  processSeqImages,
  userContent
};
