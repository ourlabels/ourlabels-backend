const winston = require("winston")
const mongoose = require("../models/mongoose");
const fs = require("fs");
const dir = "./uploads/11";
let paths = [];
let project_id = 11;
let video = true;

fs.readdirSync(dir).forEach(direlem => {
  paths.push(direlem);
});

let project = new mongoose.Projects({
  project_id,
  sequences: []
});
paths = paths.forEach(path => {
  let sequence = {
    sequence: path,
    video,
    images: []
  };
  project.sequences.push(sequence);
  let sequence_obj = project.sequences[project.sequences.length - 1];
  let files = fs.readdirSync(`${dir}/${path}`);
  for (let file of files) {
    let stats = fs.statSync(`${dir}/${path}/${file}`);
    sequence_obj.images.push({
      userid: "09afb090-2515-11e8-9843-47516699fece",
      file,
      date: new Date(),
      size: stats.size,
      classifications: []
    });
  }
});
const create = async () => {
  try {
    await project.save();
    winston.log("info", "DONE SAVING");
  } catch (err) {
    winston.log("error", err);
  }
};

create();
