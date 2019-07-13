{
  "proxyAdmin": {
    "address": "0x075910b31bE89b986BCFAdA6b5Bac3F0A7e69032",
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "proxy",
            "type": "address"
          }
        ],
        "name": "getProxyImplementation",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x204e1c7a"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x715018a6"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "proxy",
            "type": "address"
          },
          {
            "name": "newAdmin",
            "type": "address"
          }
        ],
        "name": "changeProxyAdmin",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x7eff275e"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8da5cb5b"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isOwner",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8f32d59b"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "proxy",
            "type": "address"
          },
          {
            "name": "implementation",
            "type": "address"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "upgradeAndCall",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function",
        "signature": "0x9623609d"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "proxy",
            "type": "address"
          },
          {
            "name": "implementation",
            "type": "address"
          }
        ],
        "name": "upgrade",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x99a88ec4"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xf2fde38b"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "proxy",
            "type": "address"
          }
        ],
        "name": "getProxyAdmin",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xf3b7dead"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event",
        "signature": "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
      }
    ]
  },
  "fair": {
    "address": "0x9f476f3171C4967c7C7e194643540d8b4bc87245",
    "implementation": "0x786c79a1C99Ac47523c57432a92F2C6d2aa596d9",
    "abi": [
      {
        "name": "Approval",
        "inputs": [
          {
            "type": "address",
            "name": "_owner",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_spender",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_value",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
      },
      {
        "name": "Transfer",
        "inputs": [
          {
            "type": "address",
            "name": "_from",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_value",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      },
      {
        "name": "AuthorizedOperator",
        "inputs": [
          {
            "type": "address",
            "name": "_operator",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_tokenHolder",
            "indexed": true
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xf4caeb2d6ca8932a215a353d0703c326ec2d81fc68170f320eb2ab49e9df61f9"
      },
      {
        "name": "Burned",
        "inputs": [
          {
            "type": "address",
            "name": "_operator",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_from",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_amount",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_userData",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_operatorData",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xa78a9be3a7b862d26933ad85fb11d80ef66b8f972d7cbba06621d583943a4098"
      },
      {
        "name": "Minted",
        "inputs": [
          {
            "type": "address",
            "name": "_operator",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_amount",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_userData",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_operatorData",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x2fe5be0146f74c5bce36c0b80911af6c7d86ff27e89d5cfa61fc681327954e5d"
      },
      {
        "name": "RevokedOperator",
        "inputs": [
          {
            "type": "address",
            "name": "_operator",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_tokenHolder",
            "indexed": true
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x50546e66e5f44d728365dc3908c63bc5cfeeab470722c1677e3073a6ac294aa1"
      },
      {
        "name": "Sent",
        "inputs": [
          {
            "type": "address",
            "name": "_operator",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_from",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_amount",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_userData",
            "indexed": false
          },
          {
            "type": "bytes",
            "name": "_operatorData",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x06b541ddaa720db2b10a4d0cdac39b8d360425fc073085fac19bc82614677987"
      },
      {
        "name": "UpdateConfig",
        "inputs": [
          {
            "type": "address",
            "name": "_authorizationAddress",
            "indexed": false
          },
          {
            "type": "string",
            "name": "_name",
            "indexed": false
          },
          {
            "type": "string",
            "name": "_symbol",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xec0e39fa478f9f22a9e3fd01d76c65ea1e5e8e4690df989b03d7f72358882094"
      },
      {
        "name": "initialize",
        "outputs": [],
        "inputs": [],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 77738,
        "signature": "0x8129fc1c"
      },
      {
        "name": "allowance",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_owner"
          },
          {
            "type": "address",
            "name": "_spender"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 941,
        "signature": "0xdd62ed3e"
      },
      {
        "name": "decimals",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 463,
        "signature": "0x313ce567"
      },
      {
        "name": "approve",
        "outputs": [
          {
            "type": "bool",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_spender"
          },
          {
            "type": "uint256",
            "name": "_value"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 37875,
        "signature": "0x095ea7b3"
      },
      {
        "name": "transfer",
        "outputs": [
          {
            "type": "bool",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_value"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 476117,
        "signature": "0xa9059cbb"
      },
      {
        "name": "transferFrom",
        "outputs": [
          {
            "type": "bool",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_from"
          },
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_value"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 511980,
        "signature": "0x23b872dd"
      },
      {
        "name": "isOperatorFor",
        "outputs": [
          {
            "type": "bool",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_operator"
          },
          {
            "type": "address",
            "name": "_tokenHolder"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1354,
        "signature": "0xd95b6371"
      },
      {
        "name": "granularity",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 613,
        "signature": "0x556f0dc7"
      },
      {
        "name": "defaultOperators",
        "outputs": [
          {
            "type": "address[1]",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 894,
        "signature": "0x06e48538"
      },
      {
        "name": "authorizeOperator",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_operator"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 37616,
        "signature": "0x959b8c3f"
      },
      {
        "name": "revokeOperator",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_operator"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 22646,
        "signature": "0xfad8b32a"
      },
      {
        "name": "burn",
        "outputs": [],
        "inputs": [
          {
            "type": "uint256",
            "name": "_amount"
          },
          {
            "type": "bytes",
            "name": "_userData"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 494577,
        "signature": "0xfe9d9303"
      },
      {
        "name": "operatorBurn",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_from"
          },
          {
            "type": "uint256",
            "name": "_amount"
          },
          {
            "type": "bytes",
            "name": "_userData"
          },
          {
            "type": "bytes",
            "name": "_operatorData"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 497525,
        "signature": "0xfc673c4f"
      },
      {
        "name": "send",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_amount"
          },
          {
            "type": "bytes",
            "name": "_userData"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 476840,
        "signature": "0x9bd9bbc6"
      },
      {
        "name": "operatorSend",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_from"
          },
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_amount"
          },
          {
            "type": "bytes",
            "name": "_userData"
          },
          {
            "type": "bytes",
            "name": "_operatorData"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 479789,
        "signature": "0x62ad1b83"
      },
      {
        "name": "mint",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_operator"
          },
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_quantity"
          },
          {
            "type": "bytes",
            "name": "_userData"
          },
          {
            "type": "bytes",
            "name": "_operatorData"
          }
        ],
        "constant": false,
        "payable": true,
        "type": "function",
        "gas": 450313,
        "signature": "0xab89013b"
      },
      {
        "name": "updateConfig",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_authorizationAddress"
          },
          {
            "type": "string",
            "name": "_name"
          },
          {
            "type": "string",
            "name": "_symbol"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 269103,
        "signature": "0x82328079"
      },
      {
        "name": "authorizationAddress",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1113,
        "signature": "0x57a99549"
      },
      {
        "name": "burnedSupply",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1143,
        "signature": "0x55d0a1d0"
      },
      {
        "name": "owner",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1173,
        "signature": "0x8da5cb5b"
      },
      {
        "name": "balanceOf",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "arg0"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1357,
        "signature": "0x70a08231"
      },
      {
        "name": "totalSupply",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1233,
        "signature": "0x18160ddd"
      },
      {
        "name": "name",
        "outputs": [
          {
            "type": "string",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 12207,
        "signature": "0x06fdde03"
      },
      {
        "name": "symbol",
        "outputs": [
          {
            "type": "string",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 7092,
        "signature": "0x95d89b41"
      }
    ]
  },
  "bigDiv": {
    "address": "0x3b333893820688e08292C4e7E64BF4Ee01cAA67a",
    "abi": [
      {
        "name": "bigDiv2x2",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "uint256",
            "name": "_numA"
          },
          {
            "type": "uint256",
            "name": "_numB"
          },
          {
            "type": "uint256",
            "name": "_denA"
          },
          {
            "type": "uint256",
            "name": "_denB"
          },
          {
            "type": "bool",
            "name": "_roundUp"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 11951,
        "signature": "0x56ca3d0d"
      },
      {
        "name": "bigDiv3x3",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "uint256",
            "name": "_numA"
          },
          {
            "type": "uint256",
            "name": "_numB"
          },
          {
            "type": "uint256",
            "name": "_numC"
          },
          {
            "type": "uint256",
            "name": "_denA"
          },
          {
            "type": "uint256",
            "name": "_denB"
          },
          {
            "type": "uint256",
            "name": "_denC"
          },
          {
            "type": "bool",
            "name": "_roundUp"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 18913,
        "signature": "0xd3ff49ae"
      }
    ]
  },
  "dai": {
    "address": "0x2bC24f6E7c600FE28AFC9d3f82600B9D812fbC1E",
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x06fdde03"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "spender",
            "type": "address"
          },
          {
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x095ea7b3"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x18160ddd"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "recipient",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x23b872dd"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "name": "",
            "type": "uint8"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x313ce567"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "spender",
            "type": "address"
          },
          {
            "name": "addedValue",
            "type": "uint256"
          }
        ],
        "name": "increaseAllowance",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x39509351"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "account",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x70a08231"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x95d89b41"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "spender",
            "type": "address"
          },
          {
            "name": "subtractedValue",
            "type": "uint256"
          }
        ],
        "name": "decreaseAllowance",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xa457c2d7"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "recipient",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xa9059cbb"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "owner",
            "type": "address"
          },
          {
            "name": "spender",
            "type": "address"
          }
        ],
        "name": "allowance",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xdd62ed3e"
      },
      {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor",
        "signature": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event",
        "signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event",
        "signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "account",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "mint",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x40c10f19"
      }
    ]
  },
  "dat": {
    "address": "0x8013737093Bcf53eD3F60eF7b0C60D31CDCE4A4f",
    "implementation": "0xEfd2A91d76B13142fB07bfEBC69858c18E52DbB1",
    "abi": [
      {
        "name": "Buy",
        "inputs": [
          {
            "type": "address",
            "name": "_from",
            "indexed": false
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_currencyValue",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_fairValue",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x89f5adc174562e07c9c9b1cae7109bbecb21cf9d1b2847e550042b8653c54a0e"
      },
      {
        "name": "Sell",
        "inputs": [
          {
            "type": "address",
            "name": "_from",
            "indexed": false
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_currencyValue",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_fairValue",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xa082022e93cfcd9f1da5f9236718053910f7e840da080c789c7845698dc032ff"
      },
      {
        "name": "Pay",
        "inputs": [
          {
            "type": "address",
            "name": "_from",
            "indexed": false
          },
          {
            "type": "address",
            "name": "_to",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_currencyValue",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_fairValue",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x0849372be021f4dce74a8a4cc15fcfaa23fdcfa92ae99fa045f6cdf0c0836436"
      },
      {
        "name": "Close",
        "inputs": [
          {
            "type": "uint256",
            "name": "_exitFee",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xbf67515a38ee520223d32c1266d52101c30d936ed1f3e436c8caeb0a43cb06bf"
      },
      {
        "name": "StateChange",
        "inputs": [
          {
            "type": "uint256",
            "name": "_previousState",
            "indexed": false,
            "unit": "The DAT's internal state machine"
          },
          {
            "type": "uint256",
            "name": "_newState",
            "indexed": false,
            "unit": "The DAT's internal state machine"
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0x107dddb4541735557564238389eccfc9979bfdde5e57e24e9777b6fe79b4d22f"
      },
      {
        "name": "UpdateConfig",
        "inputs": [
          {
            "type": "address",
            "name": "_authorizationAddress",
            "indexed": false
          },
          {
            "type": "address",
            "name": "_beneficiary",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_control",
            "indexed": true
          },
          {
            "type": "address",
            "name": "_feeCollector",
            "indexed": true
          },
          {
            "type": "uint256",
            "name": "_burnThresholdBasisPoints",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_feeBasisPoints",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_minInvestment",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "_openUntilAtLeast",
            "indexed": false
          },
          {
            "type": "string",
            "name": "_name",
            "indexed": false
          },
          {
            "type": "string",
            "name": "_symbol",
            "indexed": false
          }
        ],
        "anonymous": false,
        "type": "event",
        "signature": "0xb6b0738b4d09a8f93db3f073526fe7a7e19925cf17776b60f49618564fa5e42f"
      },
      {
        "name": "buybackReserve",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 2368,
        "signature": "0xff909560"
      },
      {
        "name": "initialize",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_bigDiv"
          },
          {
            "type": "address",
            "name": "_fairAddress"
          },
          {
            "type": "uint256",
            "name": "_initReserve"
          },
          {
            "type": "address",
            "name": "_currencyAddress"
          },
          {
            "type": "uint256",
            "name": "_initGoal"
          },
          {
            "type": "uint256",
            "name": "_buySlopeNum"
          },
          {
            "type": "uint256",
            "name": "_buySlopeDen"
          },
          {
            "type": "uint256",
            "name": "_investmentReserveBasisPoints"
          },
          {
            "type": "uint256",
            "name": "_revenueCommitmentBasisPoints"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 609732,
        "signature": "0x40940123"
      },
      {
        "name": "updateConfig",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_authorizationAddress"
          },
          {
            "type": "address",
            "name": "_beneficiary"
          },
          {
            "type": "address",
            "name": "_control"
          },
          {
            "type": "address",
            "name": "_feeCollector"
          },
          {
            "type": "uint256",
            "name": "_feeBasisPoints"
          },
          {
            "type": "uint256",
            "name": "_burnThresholdBasisPoints"
          },
          {
            "type": "uint256",
            "name": "_minInvestment"
          },
          {
            "type": "uint256",
            "name": "_openUntilAtLeast"
          },
          {
            "type": "string",
            "name": "_name"
          },
          {
            "type": "string",
            "name": "_symbol"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 339988,
        "signature": "0xbf330d6b"
      },
      {
        "name": "buy",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_currencyValue"
          },
          {
            "type": "uint256",
            "name": "_minTokensBought"
          }
        ],
        "constant": false,
        "payable": true,
        "type": "function",
        "gas": 452280,
        "signature": "0xa59ac6dd"
      },
      {
        "name": "sell",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_quantityToSell"
          },
          {
            "type": "uint256",
            "name": "_minCurrencyReturned"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 127087,
        "signature": "0x6a272462"
      },
      {
        "name": "pay",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_currencyValue"
          }
        ],
        "constant": false,
        "payable": true,
        "type": "function",
        "gas": 348251,
        "signature": "0xc4076876"
      },
      {
        "constant": false,
        "payable": true,
        "type": "fallback"
      },
      {
        "name": "close",
        "outputs": [],
        "inputs": [],
        "constant": false,
        "payable": true,
        "type": "function",
        "gas": 97307,
        "signature": "0x43d726d6"
      },
      {
        "name": "tokensReceived",
        "outputs": [],
        "inputs": [
          {
            "type": "address",
            "name": "_operator"
          },
          {
            "type": "address",
            "name": "_from"
          },
          {
            "type": "address",
            "name": "_to"
          },
          {
            "type": "uint256",
            "name": "_amount"
          },
          {
            "type": "bytes",
            "name": "_userData"
          },
          {
            "type": "bytes",
            "name": "_operatorData"
          }
        ],
        "constant": false,
        "payable": false,
        "type": "function",
        "gas": 313293,
        "signature": "0x0023de29"
      },
      {
        "name": "beneficiary",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 933,
        "signature": "0x38af3eed"
      },
      {
        "name": "bigDivAddress",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 963,
        "signature": "0x8a2cb6d4"
      },
      {
        "name": "burnThresholdBasisPoints",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 993,
        "signature": "0x3d16cc0b"
      },
      {
        "name": "buySlopeNum",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1023,
        "signature": "0x35e5cc31"
      },
      {
        "name": "buySlopeDen",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1053,
        "signature": "0x58439fa5"
      },
      {
        "name": "control",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1083,
        "signature": "0xd8de6587"
      },
      {
        "name": "currencyAddress",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1113,
        "signature": "0x1c1cb323"
      },
      {
        "name": "feeCollector",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1143,
        "signature": "0xc415b95c"
      },
      {
        "name": "feeBasisPoints",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1173,
        "signature": "0xb8606eef"
      },
      {
        "name": "fairAddress",
        "outputs": [
          {
            "type": "address",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1203,
        "signature": "0xb1f50f38"
      },
      {
        "name": "initGoal",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1233,
        "signature": "0x26315438"
      },
      {
        "name": "initInvestors",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "arg0"
          }
        ],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1417,
        "signature": "0x736dcb1f"
      },
      {
        "name": "initReserve",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1293,
        "signature": "0xa71ddd25"
      },
      {
        "name": "investmentReserveBasisPoints",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1323,
        "signature": "0x9df3f4f6"
      },
      {
        "name": "isCurrencyERC20",
        "outputs": [
          {
            "type": "bool",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1353,
        "signature": "0x434b536c"
      },
      {
        "name": "openUntilAtLeast",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1383,
        "signature": "0xdcf81d17"
      },
      {
        "name": "minInvestment",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1413,
        "signature": "0x8ac2c680"
      },
      {
        "name": "revenueCommitmentBasisPoints",
        "outputs": [
          {
            "type": "uint256",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1443,
        "signature": "0x6177e37c"
      },
      {
        "name": "state",
        "outputs": [
          {
            "type": "uint256",
            "unit": "The DAT's internal state machine",
            "name": "out"
          }
        ],
        "inputs": [],
        "constant": true,
        "payable": false,
        "type": "function",
        "gas": 1473,
        "signature": "0xc19d93fb"
      }
    ]
  },
  "tpl": {
    "address": "0x6F2B42123C0b92C99ffB7D361a870d55398aaa90",
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "authorized",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x456cb7c6"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "account",
            "type": "address"
          },
          {
            "name": "attributeTypeID",
            "type": "uint256"
          }
        ],
        "name": "hasAttribute",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x4b5f297a"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_authorized",
            "type": "bool"
          }
        ],
        "name": "setAuthorized",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x3b04e2a3"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "getAttributeValue",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xcd6c8343"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "countAttributeTypes",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xd71710e0"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "getAttributeTypeID",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x0e62fde6"
      }
    ]
  },
  "auth": {
    "address": "0xC0f6e78dD613ef0C776147Ce1004FB10315B4A2d",
    "implementation": "0x9F82b267cb5d7Cb001e9f9514626D802E0529E11",
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "attributeRegistry",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x00d272fc"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "authorizedTransfers",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x310eb61c"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "attributeTypeIDs",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x40645b9a"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "uint256"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "lockupPeriods",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x4f6aa46f"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "dat",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x63eb963a"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "investors",
        "outputs": [
          {
            "name": "totalLocked",
            "type": "uint256"
          },
          {
            "name": "firstExpiration",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x6f7bc9be"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x715018a6"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8da5cb5b"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isOwner",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8f32d59b"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "fair",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xa7808b30"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xf2fde38b"
      },
      {
        "anonymous": false,
        "inputs": [],
        "name": "AuthUpdated",
        "type": "event",
        "signature": "0x6b930289dec71344a2aa97854f7b12887f4b5f0dc482ba35bd3f8498b9463aad"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event",
        "signature": "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_fair",
            "type": "address"
          }
        ],
        "name": "initialize",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xc4d66de8"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_attributeRegistry",
            "type": "address"
          },
          {
            "name": "_attributeTypeIDs",
            "type": "uint256[]"
          },
          {
            "name": "_authorizedTransfers",
            "type": "uint256[]"
          },
          {
            "name": "_lockupPeriods",
            "type": "uint256[]"
          }
        ],
        "name": "updateAuth",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xdce56ce1"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_account",
            "type": "address"
          }
        ],
        "name": "getInvestorTypeOf",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x50fda9de"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_operator",
            "type": "address"
          },
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          },
          {
            "name": "_userData",
            "type": "bytes"
          },
          {
            "name": "_operatorData",
            "type": "bytes"
          }
        ],
        "name": "getLockupPeriodFor",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8780e60e"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_operator",
            "type": "address"
          },
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          },
          {
            "name": "_userData",
            "type": "bytes"
          },
          {
            "name": "_operatorData",
            "type": "bytes"
          }
        ],
        "name": "isTransferAllowed",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x88c6c48a"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_from",
            "type": "address"
          }
        ],
        "name": "availableBalanceOf",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x25d998bb"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_operator",
            "type": "address"
          },
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          },
          {
            "name": "_userData",
            "type": "bytes"
          },
          {
            "name": "_operatorData",
            "type": "bytes"
          }
        ],
        "name": "authorizeTransfer",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x50ced4cd"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_maxDepth",
            "type": "uint256"
          }
        ],
        "name": "unlockTokens",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x9d564d9a"
      }
    ]
  },
  "vesting": {
    "beneficiary": {
      "address": "0x1E563D47e181835bc34052713c7BED6eC08A235b"
    },
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "duration",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x0fb5a6b4"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "cliff",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x13d033c0"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          }
        ],
        "name": "release",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x19165587"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "beneficiary",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x38af3eed"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x715018a6"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          }
        ],
        "name": "revoke",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0x74a8f103"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "revocable",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x872a7810"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8da5cb5b"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isOwner",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x8f32d59b"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          }
        ],
        "name": "released",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0x9852595c"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "start",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xbe9a6555"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function",
        "signature": "0xf2fde38b"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "token",
            "type": "address"
          }
        ],
        "name": "revoked",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function",
        "signature": "0xfa01dc06"
      },
      {
        "inputs": [
          {
            "name": "beneficiary",
            "type": "address"
          },
          {
            "name": "start",
            "type": "uint256"
          },
          {
            "name": "cliffDuration",
            "type": "uint256"
          },
          {
            "name": "duration",
            "type": "uint256"
          },
          {
            "name": "revocable",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor",
        "signature": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "TokensReleased",
        "type": "event",
        "signature": "0xc7798891864187665ac6dd119286e44ec13f014527aeeb2b8eb3fd413df93179"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "token",
            "type": "address"
          }
        ],
        "name": "TokenVestingRevoked",
        "type": "event",
        "signature": "0x39983c6d4d174a7aee564f449d4a5c3c7ac9649d72b7793c56901183996f8af6"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event",
        "signature": "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
      }
    ]
  }
}