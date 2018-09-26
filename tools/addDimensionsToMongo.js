require("dotenv").config({ path: "../config/ourlabels.env" });
const mongoose = require("../model/mongooseModels.js");
const winston = require("winston");
let project_id = 11;


const findAndUpdateDims = async () => {
  try {
    let project = await mongoose.Projects.findOne({ project_id });
    for (let i = 0; i < project.sequences.length; i+=1) {
      for (let j = 0; j < project.sequences[i].images.length; j+=1) {
        project.sequences[i].images[j].pixelWidth = 1440
        project.sequences[i].images[j].pixelHeight = 960
      }
    }
    await project.save();
    winston.log("info", "DONE SAVING");
  } catch (err) {
    winston.log("error", `ERROR:${err}`);
  }
};

findAndUpdateDims();