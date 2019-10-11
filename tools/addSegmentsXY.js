const mongoose = require("../models/mongoose");
const winston = require("winston");
let project_id = 11;

const findAndUpdate = async () => {
  try {
    let project = await mongoose.Projects.findOne({ project_id });
    winston.log("info", project);
    let seq_len = project.sequences.length;
    for (let i = 0; i < seq_len; i += 1) {
      project.sequences[i].segmentsX = 2;
      project.sequences[i].segmentsY = 2;
    }
    await project.save();
    winston.log("info", "DONE SAVING");
  } catch (err) {
    winston.log("error", `ERROR:${err}`);
  }
};

findAndUpdate();
