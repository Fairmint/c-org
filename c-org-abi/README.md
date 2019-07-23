# c-org ABIs

A JSON file with ABIs for the c-org contracts including FAIR and DAT.

## How-to publish

In order to publish a new version:
 - Update addresses in `c-org-abi/addresses.json` (this could be automated in the future)
 - Update the version in `c-org-abi/package.json` 
 - Merge to master
 - Tag a new release in GitHub

Circle CI will then create the JSON and publish this package to [npmjs.com](https://www.npmjs.com/package/c-org-abi)
