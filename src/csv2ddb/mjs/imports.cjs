/* eslint-disable @typescript-eslint/no-var-requires */
let aws = require('aws-sdk');
let csv = require('csvtojson');

module.exports = {
  csv,
  DynamoDB: aws.DynamoDB,
  S3: aws.S3,
};
