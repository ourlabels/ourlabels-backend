require("dotenv").config({ path: "../../config/ourlabels.env" });
const mongoose = require("../models/mongoose");
const fs = require("fs");

const modifyProject = async () => {
  try {
    let mongoProject = await mongoose.Projects.findOne({ project_id: 11 });
    for (let i = 0; i < mongoProject.sequences.length; i += 1) {
      for (let j = 0; j < mongoProject.sequences[i].images.length; j += 1) {
        let sequence_name = mongoProject.sequences[i].sequence;
        let old_file_name = `${mongoProject.sequences[i].images[j].file}`;
        let old_file_path = `${__dirname}/../uploads/11/${sequence_name}/${old_file_name}`;
        let jstring = `${j}`.padStart(5, "0");
        let new_file_name = `${sequence_name}-${jstring}.jpg`;
        let new_file_path = `${__dirname}/../uploads/11/${sequence_name}/${new_file_name}`;
        try {
          fs.renameSync(old_file_path, new_file_path);
        } catch (err) {
          console.log("No file")
        }
        mongoProject.sequences[i].images[j].file = new_file_name
      }
    }
    await mongoProject.save()
    console.log("DONE")
  } catch (err) {
    console.log("error", err);
  }
};

modifyProject();
