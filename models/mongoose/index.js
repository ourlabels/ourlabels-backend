"use strict";
const mongoose = require("mongoose");
const {
  MONGO_CONNECTION_TYPE,
  MONGO_HOST,
  MONGO_INITDB_DATABASE,
  MONGO_INITDB_ROOT_USERNAME,
  MONGO_INITDB_ROOT_PASSWORD
} = process.env;
const mongo_uri = `${MONGO_CONNECTION_TYPE}://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGO_HOST}`;
mongoose.Promise = require("bluebird");

const BoxSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  type_key: String,
  truncated: Boolean,
  occluded: Boolean,
  difficult: Boolean,
  name: Number
});

const ClassificationSchema = new mongoose.Schema({
  userid: {
    type: String,
    index: true
  },
  verified_id: String, // id of user verified
  verified_date: Date,
  type: Number, // 0 for labeling, 1 for verification of labeling, 2 for analysis of sign,
  boxes: {
    type: [BoxSchema],
    default: []
  },
  date: Date
});

const ImageSchema = new mongoose.Schema(
  {
    userid: {
      type: String,
      index: true
    },
    file: String, // not the full path, but the file name
    date: Date,
    size: Number,
    classifications: [ClassificationSchema],
    pixelWidth: Number,
    pixelHeight: Number
  },
  { collection: "Images" }
);
const ImageSequenceSchema = new mongoose.Schema(
  {
    sequence: {
      type: String,
      index: true
    },
    video: {
      type: Boolean
    },
    images: [ImageSchema],
    segmentsX: Number,
    segmentsY: Number
  },
  { collection: "ImageSequences" }
);
const ProjectSchema = new mongoose.Schema(
  {
    project_id: Number,
    sequences: [ImageSequenceSchema]
  },
  { collection: "Projects" }
);
const LabelDocSchema = new mongoose.Schema(
  {
    r: Number,
    g: Number,
    b: Number,
    a: Number,
    type: String,
    description: String
  },
  { collection: "LabelDocs" }
);

const LabelSetsSchema = new mongoose.Schema(
  {
    project: { type: String, index: true },
    labels: { type: [LabelDocSchema] }
  },
  { collection: "LabelSets" }
);
const db = mongoose.createConnection(
  mongo_uri,
  {
    dbName: MONGO_INITDB_DATABASE,
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true
  },
  err => {
    if (err) {
      console.log(`Mongoose Error: ${err}`);
    }
  }
);

const Projects = db.model("Projects", ProjectSchema, "Projects");
const LabelSets = db.model("LabelSets", LabelSetsSchema, "LabelSets");
module.exports = {
  Projects,
  LabelSets,
  ObjectId: mongoose.Types.ObjectId
};
