/* eslint-disable @typescript-eslint/no-var-requires */
const csv = require('csvtojson');
const xray = require('aws-xray-sdk-core');

export default {
  csv,
  XRay: xray,
};
