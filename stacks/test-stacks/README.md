# CSV to DynamoDB

CDK stack which fetches a CSV file filled with sales info, loops over it and writes it into DynamoDB.

CSV file courtesy of [eforexcel](https://eforexcel.com/wp/downloads-18-sample-csv-files-data-sets-for-testing-sales/).

This stack tests different AWS SDK versions and configurations to attempt to determine which is best for cold starts and execution.

1. Installs clients only from aws-sdk v2.
2. Installs entire aws-sdk v2.
3. Omits aws-sdk and uses native Lambda aws-sdk.
4. Uses a Lambda Layer for aws-sdk.
5. Uses modular aws-sdk v3.
