/* eslint-disable @typescript-eslint/no-var-requires */
let aws = require('aws-sdk');
let csv = require('csvtojson');
let xray = require('aws-xray-sdk-core');

module.exports = {
  csv,
  DynamoDB: aws.DynamoDB,
  S3: aws.S3,
  XRay: xray,
};
