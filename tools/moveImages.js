const winston = require("winston");
require("dotenv").config({ path: "../config/ourlabels.env" });
const mongoose = require("../model/mongooseModels.js");
const fs = require("fs");
let project_id = 11;
fs.mkdirSync(`./uploads/${project_id}`);
const moveImages = async () => {
  try {
    let project = await mongoose.Projects.findOne({ project_id });
    let seq_len = project.sequences.length;
    for (let i = 0; i < seq_len; i += 1) {
      let seqname = project.sequences[i].sequence;
      fs.mkdirSync(`./uploads/11/${seqname}`);
      let images = project.sequences[i].images;
      for (let image of images) {
        let file = image.file.split(".")[0];
        fs.renameSync(
          `./uploads/${file}`,
          `./uploads/${project_id}/${seqname}/${file}.jpg`
        );
      }
    }
    //await project.save();
    winston.log("info", "DONE SAVING");
  } catch (err) {
    winston.log("error", `ERROR:${err}`);
  }
};

moveImages();
