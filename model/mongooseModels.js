"use strict";
const mongoose = require("mongoose");
let uri = `mongodb://${process.env.MONGO_URI}`;
mongoose.Promise = require("bluebird");

const BoxSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  type_key: String,
  justCreated: Boolean,
  id: Number
});

const ClassificationSchema = new mongoose.Schema({
  userid: {
    type: String,
    index: true
  },
  type: Number, // 0 for labeling, 1 for verification of labeling, 2 for analysis of sign
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
    file: String,
    date: Date,
    size: Number,
    classifications: [ClassificationSchema]
  },
  { collection: "Images" }
);

const ImageSequenceSchema = new mongoose.Schema(
  {
    sequence: {
      type: String,
      index: true
    },
    images: [ImageSchema]
  },
  { collection: "ImageSequences" }
);

const Images = mongoose.model("Images", ImageSchema);
const ImageSequences = mongoose.model("ImageSequences", ImageSequenceSchema);
const Classifications = mongoose.model("Classifications", ClassificationSchema);
const Boxes = mongoose.model("Boxes", BoxSchema);

mongoose.connect(uri, {
  user: process.env.MONGO_USERNAME,
  pass: process.env.MONGO_PASSWORD
});
module.exports = {
  ImageSequences: ImageSequences,
  ObjectId: mongoose.Types.ObjectId
};
