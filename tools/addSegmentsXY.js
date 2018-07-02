require("dotenv").config({ path: "../config/ourlabels.env" });
const mongoose = require("../model/mongooseModels.js");
let project_id = 11;

const findAndUpdate = async () => {
  try {
    let project = await mongoose.Projects.findOne({ project_id });
    console.log(project)
    let seq_len = project.sequences.length;
    for (let i = 0; i < seq_len; i += 1) {
      project.sequences[i].segmentsX = 2;
      project.sequences[i].segmentsY = 2;
    }
    await project.save();
    console.log("DONE SAVING");
  } catch (err) {
    console.error(`ERROR:${err}`);
  }
};

findAndUpdate();