const fs = require("fs");
const rimraf = require("rimraf");
const spawnSync = require("child_process").spawnSync;
const express = require("express");
var sizeOf = require("image-size");
const router = express.Router();
const ensure = require("connect-ensure-login");
const db = require("../../../models");
const mongoose = require("../../../model/mongooseModels");
const { validationResult, checkSchema } = require("express-validator/check");
const { getAnnotationsSchema } = require("../../constants");
const builder = require("xmlbuilder");

router.get(
  "/",
  ensure.ensureLoggedIn(),
  checkSchema(getAnnotationsSchema),
  async (req, res) => {
    if (validationResult(req).array().length > 0) {
      throw "400";
    }
    let seq = req.user.last_seq; // ObjectId String
    let offset = parseInt(req.query.offset);
    let project_id = req.user.current_project;
    try {
      if (project_id == null || seq == null || req.user.last_idx == null) {
        throw "404";
      }
      let idx = req.user.last_idx + offset; // Index
      let avail = await mongoose.Projects.aggregate([
        { $match: { project_id } },
        { $unwind: "$sequences" },
        { $match: { "sequences._id": mongoose.ObjectId(seq) } },
        {
          $project: {
            images: { $slice: ["$sequences.images", idx, 1] }
          }
        },
        { $unwind: "$images" }
      ]);
      const classifications = avail[0].images.classifications;
      let boxes = [];
      if (avail[0].images.classifications.length !== 0) {
        boxes = classifications[classifications.length - 1].boxes;
      }
      return res.status(200).json({ success: true, boxes, idx });
    } catch (err) {
      if (err === "400") {
        return res
          .status(400)
          .json({ success: false, error: validationResult(req).array() });
      } else if (err === "404") {
        return res.status(404).json({
          success: false,
          error: "Could not find current sequence or index"
        });
      }
      return res.status(500).json({ success: false, error: err });
    }
  }
);
router.get("/as/json", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    if (req.query.projectId == null || req.query.projectId === "") {
      throw "400";
    }
    const id = parseInt(req.query.projectId);
    let postgresProject = await db.projects.findOne({ where: { id } });
    if (!postgresProject.public && postgresProject.owner !== req.user.id) {
      throw "401";
    }
    let mongoProject = await mongoose.Projects.aggregate([
      { $match: { project_id: id } },
      {
        $unwind: {
          path: "$sequences"
        }
      },
      {
        $project: {
          "sequences.images": 1,
          "sequences.sequence": 1
        }
      },
      {
        $unwind: {
          path: "$sequences.images",
          includeArrayIndex: "arrayIndex"
        }
      },
      {
        $project: {
          "sequences.sequence": 1,
          "sequences.images.file": 1,
          "sequences.images.date": 1,
          "sequences.images.classifications": 1,
          arrayIndex: 1
        }
      },
      {
        $unwind: {
          path: "$sequences.images.classifications"
        }
      }
    ]);
    let mongoLabelSet = await mongoose.LabelSets.findOne({ project: id });
    if (
      mongoLabelSet == null ||
      mongoProject == null ||
      postgresProject == null
    ) {
      throw "404";
    }
    let mongoLabels = mongoLabelSet.labels;
    if (mongoLabels.length === 0) {
      throw "404";
    }
    // format: http://cocodataset.org/#format-data
    let dataset_json = {};
    dataset_json["info"] = {
      year: new Date().getFullYear,
      version: "1",
      description: postgresProject.full_description,
      contributor: req.user.username,
      url: "ourlabels.org",
      date_created: postgresProject.createdAt
    };
    dataset_json["images"] = [];
    dataset_json["annotations"] = [];
    dataset_json["categories"] = [];
    dataset_json["licenses"] = [];
    let category_json = {};
    for (let i = 0; i < mongoLabels.length; i += 1) {
      let category = {
        id: i + 1,
        supercategory: mongoLabels[i].type,
        name: mongoLabels[i].type
      };
      category_json[mongoLabels[i].type] = i + 1;
      dataset_json["categories"].push(category);
    }
    let i = 1;
    let j = 1;
    let indexes = [];
    let array_index_json = {};
    for (let imageWithClassification of mongoProject) {
      // imageWithClassification.sequences.images.classifications.boxes is array of annotations
      let fullFilePath = `${__dirname}/../../../uploads/${id}/${
        imageWithClassification.sequences.sequence
      }/${imageWithClassification.sequences.images.file}`;

      if (fs.existsSync(fullFilePath)) {
        // file exists, so use its content
        let imageSize = sizeOf(fullFilePath);
        if (!indexes.includes(imageWithClassification.arrayIndex)) {
          indexes.push(imageWithClassification.arrayIndex);
          let image = {
            id: i,
            width: imageSize.width,
            height: imageSize.height,
            file_name: imageWithClassification.sequences.images.file,
            license: 1,
            filckr_url: "",
            coco_url: "",
            date_captured: imageWithClassification.sequences.images.date
          };
          dataset_json["images"].push(image);
          array_index_json[imageWithClassification.arrayIndex] = image;
          i += 1;
        }
        for (let box of imageWithClassification.sequences.images.classifications
          .boxes) {
          // a box is an annotation
          let width =
            array_index_json[imageWithClassification.arrayIndex]["width"];
          let height =
            array_index_json[imageWithClassification.arrayIndex]["height"];
          let x = box.x * width;
          let y = box.y * height;
          let w = box.width * width;
          let h = box.height * height;
          let annotation = {
            id: j,
            image_id:
              array_index_json[imageWithClassification.arrayIndex]["id"],
            bbox: [x, y, w, h],
            area: w * h,
            segmentation: [],
            category_id: category_json[box.type_key],
            iscrowd: 0
          };
          j += 1;
          dataset_json["annotations"].push(annotation);
        }
      }
    }
    let tempPath = `${__dirname}/${req.user.id}`;
    if (fs.existsSync(tempPath)) {
      rimraf.sync(tempPath);
    }
    fs.mkdirSync(tempPath);
    fs.writeFileSync(
      `${tempPath}/annotations.json`,
      JSON.stringify(dataset_json)
    );
    let args = ["-cjf", "annotations.tar.bz2", "annotations.json"];
    spawnSync("tar", args, { cwd: tempPath });
    res.sendFile(`${tempPath}/annotations.tar.bz2`, err => {
      if (err) {
        next(err);
      } else {
        rimraf.sync(tempPath);
      }
    });
  } catch (err) {
    if (err === "400") {
      return res.status(400).json({
        success: false,
        error: "Incorrect parameters, requires projectId query param"
      });
    } else if (err === "401") {
      return res.status(401).json({
        success: false,
        error: "Not project owner"
      });
    } else if (err === "404") {
      return res.status(404).json({
        success: false,
        error: "No such project"
      });
    }
    return res.status(500).json({ success: false, error: err });
  }
});

router.get("/as/xml", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    if (req.query.projectId == null || req.query.projectId === "") {
      throw "400";
    }
    const id = parseInt(req.query.projectId);
    let postgresProject = await db.projects.findOne({ where: { id } });
    if (!postgresProject.public && postgresProject.owner !== req.user.id) {
      throw "401";
    }
    let mongoProject = await mongoose.Projects.aggregate([
      { $match: { project_id: id } },
      {
        $unwind: {
          path: "$sequences"
        }
      },
      {
        $project: {
          "sequences.images": 1,
          "sequences.sequence": 1
        }
      },
      {
        $unwind: {
          path: "$sequences.images",
          includeArrayIndex: "arrayIndex"
        }
      },
      {
        $project: {
          "sequences.sequence": 1,
          "sequences.images.file": 1,
          "sequences.images.date": 1,
          "sequences.images.classifications": 1,
          arrayIndex: 1
        }
      },
      {
        $unwind: {
          path: "$sequences.images.classifications"
        }
      }
    ]);
    let mongoLabelSet = await mongoose.LabelSets.findOne({ project: id });
    if (
      mongoLabelSet == null ||
      mongoProject == null ||
      postgresProject == null
    ) {
      throw "404";
    }
    let mongoLabels = mongoLabelSet.labels;
    if (mongoLabels.length === 0) {
      throw "404";
    }
    let tempPath = `${__dirname}/${req.user.id}`;
    if (fs.existsSync(tempPath)) {
      rimraf.sync(tempPath);
    }
    fs.mkdirSync(tempPath);
    let i = 0;
    for (let annotation of mongoProject) {
      let seq = annotation.sequences.sequence;
      let filename = annotation.sequences.images.file;
      let fullFilePath = `${__dirname}/../../../uploads/${id}/${seq}/${filename}`;
      if (!fs.existsSync(fullFilePath)) {
        continue;
      }
      let img_size = sizeOf(fullFilePath);
      let xml = builder.create("annotation", {}, {}, { headless: true }); // root
      xml.ele("folder", {}, seq);
      xml.ele("filename", {}, filename);
      let xml_size = builder.create("size");
      xml_size.ele("width", {}, img_size.width);
      xml_size.ele("height", {}, img_size.height);
      xml_size.ele("depth", {}, 3);
      xml.importDocument(xml_size);
      xml.ele("segmented", {}, 0);
      for (let box of annotation.sequences.images.classifications.boxes) {
        let xml_object = builder.create("object");
        xml_object.ele("name", {}, box.type_key);
        xml_object.ele("truncated", {}, box.truncated ? 1 : 0);
        xml_object.ele("occluded", {}, box.occluded ? 1 : 0);
        xml_object.ele("difficult", {}, box.difficult ? 1 : 0);
        let bndbox = builder.create("bndbox");
        let xmin = box.x * img_size.width;
        let ymin = box.y * img_size.height;
        let xmax = (box.x + box.width) * img_size.width;
        let ymax = (box.y + box.height) * img_size.height;
        bndbox.ele("xmin", {}, xmin);
        bndbox.ele("ymin", {}, ymin);
        bndbox.ele("xmax", {}, xmax);
        bndbox.ele("ymax", {}, ymax);
        xml_object.importDocument(bndbox);
        xml.importDocument(xml_object);
      }
      let stringxml = xml.end({ pretty: true });
      fs.writeFileSync(`${tempPath}/${i}.xml`, stringxml, { encoding: "utf8" });
      i += 1;
    }
    let lsout = spawnSync("ls", [], { cwd: tempPath });
    let lsstring = lsout.stdout
      .toString("utf8")
      .trim()
      .split("\n");
    let args = ["-cjf", "annotations.tar.bz2"].concat(lsstring); // spawnSync does NOT expand wildcards
    spawnSync("tar", args, { cwd: tempPath });
    res.sendFile(`${tempPath}/annotations.tar.bz2`, err => {
      if (err) {
        next(err);
      } else {
        rimraf.sync(tempPath);
      }
    });
  } catch (err) {
    if (err === "400") {
      return res.status(400).json({
        success: false,
        error: "Incorrect parameters, requires projectId query param"
      });
    } else if (err === "401") {
      return res.status(401).json({
        success: false,
        error: "Not project owner"
      });
    } else if (err === "404") {
      return res.status(404).json({
        success: false,
        error: "No such project"
      });
    }
    return res.status(500).json({ success: false, error: err });
  }
});

module.exports = router;
