# Reference implementation for continuous organizations

[![Coverage Status](https://coveralls.io/repos/github/Fairmint/c-org/badge.svg?branch=master)](https://coveralls.io/github/Fairmint/c-org?branch=master)

This repository contains the reference implementation for smart-contracts implementing the [continuous organization whitepaper](https://github.com/C-ORG/whitepaper). 

See the announcement here: [https://blog.fairmint.com/fairmint-releases-its-bonding-curve-contract-in-open-source-1d142b9baaa8](https://blog.fairmint.com/fairmint-releases-its-bonding-curve-contract-in-open-source-1d142b9baaa8)

You will find in this repository:
* the smart-contracts [specification](https://github.com/Fairmint/c-org/wiki)
* the code for the Ethereum blockchain

## Development

```
yarn
yarn ganache

# in a second prompt
yarn test
```

## Important disclaimer

The continuous organization whitepaper was written in 2018 and this implementation created in months after. Since then, we created Fairmint to provide founders with the easiest, cheapest, and sexiest solution to issue equity onchain compliantly. While we originally started by implementing the whitepaper, we've learned A LOT and iterated many times: from the CSO described in the whitepaper to the [CAFE](https://blog.fairmint.com/introducing-the-cafe-ae12d6c34cc0), the [Rolling SAFE](https://www.businesswire.com/news/home/20220524005241/en/Fairmint-Launches-the-First-Solution-Enabling-Community-Ownership-Through-Equity-Tokenization) and the [Community SAFE](https://simulator.fairmint.com/community-safe-equity-simulator)... Today, using Fairmint, you can raise funds, publicly or privately, directly from your website, compliantly, using the legal terms that suit you and your company best (from the traditional YC SAFEs to our more community-oriented SAFEs, or even using your custom legal form). Head to [https://fairmint.com](https://fairmint.com) to start and go live with your fundraising in less than 10 minutes!
