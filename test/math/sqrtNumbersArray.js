const sqrtArtifact = artifacts.require("Sqrt");
const BigNumber = require("bignumber.js");

// Goal is up to off by 1 + 0.01% error
const MAX_DELTA_RATIO_FROM_EXPECTED = 0.0001;
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const MAX_UINT192 = new BigNumber(2).pow(192).minus(1);
const MAX_UINT128 = new BigNumber(2).pow(128).minus(1);
const MAX_UINT64 = new BigNumber(2).pow(64).minus(1);
const MAX_UINT32 = new BigNumber(2).pow(32).minus(1);

const numbers = [
  new BigNumber("0"),
  new BigNumber("1"),
  new BigNumber("2"),
  new BigNumber("3"),
  new BigNumber("97"),
  MAX_UINT32.div("1009").dp(0),
  MAX_UINT32.div("10").dp(0),
  MAX_UINT32.div("2")
    .dp(0)
    .minus("1"),
  MAX_UINT32.div("2").dp(0),
  MAX_UINT32.div("2")
    .dp(0)
    .plus("1"),
  MAX_UINT32.minus("1"),
  MAX_UINT32,
  MAX_UINT32.plus("1"),
  MAX_UINT32.times("2").minus("1"),
  MAX_UINT32.times("2"),
  MAX_UINT32.times("2").plus("1"),
  MAX_UINT32.times("10"),
  MAX_UINT32.times("1009"),
  MAX_UINT64.div("1009").dp(0),
  MAX_UINT64.div("10").dp(0),
  MAX_UINT64.div("2")
    .dp(0)
    .minus("1"),
  MAX_UINT64.div("2").dp(0),
  MAX_UINT64.div("2")
    .dp(0)
    .plus("1"),
  MAX_UINT64.minus("1"),
  MAX_UINT64,
  MAX_UINT64.plus("1"),
  MAX_UINT64.times("2").minus("1"),
  MAX_UINT64.times("2"),
  MAX_UINT64.times("2").plus("1"),
  MAX_UINT64.times("10"),
  MAX_UINT64.times("1009"),
  new BigNumber("123456789123456789"),
  new BigNumber("849841365163516514614635436"),
  new BigNumber("8498413651635165146846416314635436"),
  new BigNumber("34028236692093842568444274447460650188"),
  MAX_UINT128.div("1009").dp(0),
  MAX_UINT128.div("10").dp(0),
  MAX_UINT128.div("2")
    .dp(0)
    .minus("1"),
  MAX_UINT128.div("2").dp(0),
  MAX_UINT128.div("2")
    .dp(0)
    .plus("1"),
  MAX_UINT128.minus("2"),
  MAX_UINT128.minus("1"),
  MAX_UINT128,
  MAX_UINT128.plus("1"),
  MAX_UINT128.plus("2"),
  MAX_UINT128.plus("3"),
  MAX_UINT128.times("2").minus("1"),
  MAX_UINT128.times("2"),
  MAX_UINT128.times("2").plus("1"),
  MAX_UINT128.times("10"),
  MAX_UINT128.times("1009"),
  new BigNumber("99993402823669209384634633746074317682114579999"),
  new BigNumber("8888834028236692093846346337460743176821145799999"),
  new BigNumber(
    "20892373161954235709850086879078532699846623564056403945759935"
  ),
  new BigNumber(
    "2089237316195423570985008687907853269984665640564039457584007913129639935"
  ),
  MAX_UINT192.div("1009").dp(0),
  MAX_UINT192.div("10").dp(0),
  MAX_UINT192.div("2")
    .dp(0)
    .minus("1"),
  MAX_UINT192.div("2").dp(0),
  MAX_UINT192.div("2")
    .dp(0)
    .plus("1"),
  MAX_UINT192.minus("1"),
  MAX_UINT192,
  MAX_UINT192.plus("1"),
  MAX_UINT192.times("2").minus("1"),
  MAX_UINT192.times("2"),
  MAX_UINT192.times("2").plus("1"),
  MAX_UINT192.times("10"),
  MAX_UINT192.times("1009"),
  MAX_UINT256.div("1009").dp(0),
  MAX_UINT256.div("10").dp(0),
  MAX_UINT256.div("2")
    .dp(0)
    .minus("1"),
  MAX_UINT256.div("2").dp(0),
  MAX_UINT256.div("2")
    .dp(0)
    .plus("1"),
  MAX_UINT256.minus("2"),
  MAX_UINT256.minus("1"),
  MAX_UINT256
];

const getValue = (expectedBN, squared = false) => {
  if (squared) {
    // diff may drop 10^13 decimals
    expectedBN = new BigNumber(expectedBN)
      .div(new BigNumber(10).pow(13))
      .dp(0)
      .times(new BigNumber(10).pow(13));
  }
  let maxDiff = new BigNumber(MAX_DELTA_RATIO_FROM_EXPECTED).times(expectedBN);
  if (!squared) {
    maxDiff = maxDiff.plus(1).dp(0);
  } else {
    maxDiff = maxDiff.plus(new BigNumber(10).pow(13));
  }

  const minVal = expectedBN.minus(maxDiff);
  const maxVal = expectedBN.plus(maxDiff);

  return [minVal, maxVal];
};

// Checks that the difference is no greater than max(1, MAX_DELTA of expectation)
const checkBounds = (expectedBN, resultBN, squared) => {
  const [minVal, maxVal] = getValue(expectedBN, squared);

  assert(
    resultBN.gte(minVal),
    `${resultBN.toFixed()} is not >= ${minVal.toFixed()} (and <= ${maxVal.toFixed()})`
  );
  assert(
    resultBN.lte(maxVal),
    `${resultBN.toFixed()} is not <= ${maxVal.toFixed()} (and >= ${minVal.toFixed()})`
  );
};

contract("math / sqrtNumbersArray", () => {
  let contract;

  before(async () => {
    contract = await sqrtArtifact.new();
  });

  for (let i = numbers.length - 1; i >= 0; i--) {
    const x = numbers[i];

    let sqrtResult = new BigNumber(x).sqrt();
    it(`sqrt(${x.toFixed()}) ~= ${sqrtResult.toExponential(2)}`, async () => {
      sqrtResult = sqrtResult.dp(0);
      const contractRes = new BigNumber(await contract.sqrt(x.toFixed()));
      checkBounds(sqrtResult, contractRes);
    });
  }
});
