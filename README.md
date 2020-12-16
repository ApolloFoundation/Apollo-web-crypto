# Apollo Web Crypto

## Disclaimer.
Apollo team is actively working on modularity of Apollo blockchain so build scripts and source structure is subject of changes. Apollo project consists of several modules written in different programming languages. If you are not an expert in Java and Maven, JavaScript, NodeJs, npm, yarn, C/C++ and Cmakle please use our release builds at [Apollo Releases page](https://github.com/ApolloFoundation/Apollo/releases).

If you feel like an expert, please use build instructions below. But also please note that instructions may be slightly outdated, especially in "development" branches of the Apollo project repositories.


Apollo is being developed by the Apollo Foundation and supporting members of the community.

This repository contains NPM module implementation of main crypto functions.

There are other components that are parts of Apollo:

1. [Apollo](https://github.com/ApolloFoundation/Apollo): Core classes of Apollo blockchain platform and main executable of Apollo-blockchain component.
2. [Apollo-web-ui](https://github.com/ApolloFoundation/Apollo-web-ui): Web wallet UI that is served by Apollo blockchain node and can be accersed by browser at http://localhost:7876
3. [Apollo-dektop](https://github.com/ApolloFoundation/Apollo-desktop): Desktop wallet UI. Apollo-web-ui must be installed tobe able to run Apollo desktop wallet.
4. [Apollo-tools](https://github.com/ApolloFoundation/Apollo-tools): "swiss knife" of tools for node maintenance, transaction signing, etc.
5. [Apollo-bom-ext](https://github.com/ApolloFoundation/Apollo-bom-ext): This module required in compilation time oly. It contains BOM of all external libraries used by Apollo components.

## Requirements
The latest NodeJS LTS version is required to develop and build Apollo Web Crypto.
It could be downloaded from [NodeJS official site](https://nodejs.org/uk/).
For developers (Linux, OS X)[Node Version Manager](https://github.com/nvm-sh/nvm) is highly recommended. If you use Windows OS, please consider trying [Node Version Manager (nvm) for Windows](https://github.com/coreybutler/nvm-windows).

__Yarn__ is the build tool for Apollo-web-crypto.
To install  __yarn__, please run following command in a terminal window:
```
npm install -g yarn
```

## Building
Firstly you need to generate api help folder. It is based on .yaml file in the main [Apollo backend](https://github.com/ApolloFoundation/Apollo) repository.
```
yarn install
yarn generate-apollo-api-v2
```
For build of that module:
```
yarn build
```

## Formatting and Linting
We are using Prettier and TsLint!
```
yarn lint
yarn format
```

## Tests (with Jest)
In the `src` folder, we have folder called `__tests__`.
Add a new file with a name you like, but it has to end with `test.ts`, for example `FBCrypto.test.ts`

Run tests:
```
yarn test
```

## Bumping a new npm package version
Let’s bump a new patch version of the package:
```
npm version patch
```
Our `preversion`, `version`, and `postversion` will run, create a new tag in git and push it to our remote repository. Now publish:
```
npm publish --access=public
```
And now you have a new version.


## Implementation

### Reed-Solomon Encryption
To use the Reed-Solomon encryption, the corresponding cryptographic module can be used. To  set it up, the following steps  should be taken:
    
   1. Import Reed-Solomon encryption functions from  the initial code:
      `import {processAccountIDtoRS, processAccountRStoID} from 'apl-web-crypto';`
   2. Usage:
        `const accountRS = processAccountIDtoRS(accountID)`, 
        where `accountID` is user's account id. This function will return account RS value like APL-XXXX-XXXX-XXXX-XXXXX
        
        `const accountID = processAccountRStoID(accountRS)`,
        where `accountRS` is user's account like APL-XXXX-XXXX-XXXX-XXXXX. This function will return account id.

