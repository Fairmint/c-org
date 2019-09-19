const BigNumber = require("bignumber.js");
const bigMathArtifact = artifacts.require("BigMath");
const shouldFail = require("../helpers/shouldFail");

contract("bigMath / bigDiv", accounts => {
  let contract;
  const maxValue = new BigNumber(2).pow(256).minus(1);

  before(async () => {
    contract = await bigMathArtifact.new();
  });

  it("2x1 random math works", async () => {
    for (let i = 0; i < 999; i++) {
      const numA = new BigNumber(Math.random()).times(maxValue).dp(0);
      const numB = new BigNumber(Math.random()).times(maxValue).dp(0);
      const den = new BigNumber(Math.random()).times(maxValue).dp(0);
      //console.log(`${numA.toFixed()}*${numB.toFixed()}/${den.toFixed()}`);
      const expected = numA
        .times(numB)
        .div(den)
        .dp(0);
      if (expected.lte(maxValue)) {
        const result = await contract.bigDiv2x1(
          numA.toFixed(),
          numB.toFixed(),
          den.toFixed(),
          false
        );
        if (expected.gt(0)) {
          const delta = expected.minus(result);
          if (expected.gt(10000)) {
            assert(delta.div(expected).lte(0.001));
          } else {
            // not very accurate when the result is a small number
            assert(delta.lte(expected.div(2).dp(0, BigNumber.ROUND_UP)));
          }
        } else {
          assert.equal(result, 0);
        }
      } else {
        // revert if the result is > 256bits
        await shouldFail(
          contract.bigDiv2x1(
            numA.toFixed(),
            numB.toFixed(),
            den.toFixed(),
            false
          )
        );
      }
    }
  });

  it("2x2 random math works", async () => {
    for (let i = 0; i < 999; i++) {
      const numA = new BigNumber(Math.random()).times(maxValue).dp(0);
      const numB = new BigNumber(Math.random()).times(maxValue).dp(0);
      const denA = new BigNumber(Math.random()).times(maxValue).dp(0);
      const denB = new BigNumber(Math.random()).times(maxValue).dp(0);
      // console.log(
      //   `${numA.toFixed()}*${numB.toFixed()}/(${denA.toFixed()}*${denB.toFixed()})`
      // );
      const expected = numA
        .times(numB)
        .div(denA.times(denB))
        .dp(0);
      if (expected.lte(maxValue)) {
        const result = await contract.bigDiv2x2(
          numA.toFixed(),
          numB.toFixed(),
          denA.toFixed(),
          denB.toFixed()
        );
        if (expected.gt(0)) {
          const delta = expected.minus(result);
          if (expected.gt(10000)) {
            assert(delta.div(expected).lte(0.001));
          } else {
            // not very accurate when the result is a small number
            assert(delta.lte(expected.div(2).dp(0, BigNumber.ROUND_UP)));
          }
        } else {
          assert.equal(result, 0);
        }
      } else {
        // revert if the result is > 256bits
        await shouldFail(
          contract.bigDiv2x2(
            numA.toFixed(),
            numB.toFixed(),
            denA.toFixed(),
            denB.toFixed()
          )
        );
      }
    }
  });

  it("2x1 does not overflow with sqrt max value", async () => {
    const sqrtMax = maxValue.sqrt().dp(0);
    await contract.bigDiv2x1(sqrtMax.toFixed(), 1, 1, false);
    await contract.bigDiv2x1(1, sqrtMax.toFixed(), 1, false);
    await contract.bigDiv2x1(1, 1, sqrtMax.toFixed(), false);
    await contract.bigDiv2x1(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      1,
      false
    );
    await contract.bigDiv2x1(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      sqrtMax.toFixed(),
      false
    );
  });

  it("2x1 does not overflow with half max value", async () => {
    await contract.bigDiv2x1(
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      1,
      1,
      true
    );
    await contract.bigDiv2x1(
      1,
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      1,
      true
    );
    await contract.bigDiv2x1(
      1,
      1,
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      true
    );
    await contract.bigDiv2x1(
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      true
    );
  });

  it("2x1 does not overflow with max value", async () => {
    await contract.bigDiv2x1(maxValue.toFixed(), 1, 1, false);
    await contract.bigDiv2x1(1, maxValue.toFixed(), 1, false);
    await contract.bigDiv2x1(1, 1, maxValue.toFixed(), false);
    await contract.bigDiv2x1(maxValue.toFixed(), 1, maxValue.toFixed(), false);
  });

  it("2x2 does not overflow with sqrt max value", async () => {
    const sqrtMax = maxValue.sqrt().dp(0);
    await contract.bigDiv2x2(sqrtMax.toFixed(), 1, 1, 1);
    await contract.bigDiv2x2(1, sqrtMax.toFixed(), 1, 1);
    await contract.bigDiv2x2(1, 1, sqrtMax.toFixed(), 1);
    await contract.bigDiv2x2(1, 1, 1, sqrtMax.toFixed());
    await contract.bigDiv2x2(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      1,
      1
    );
    await contract.bigDiv2x2(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed()
    );
  });

  it("2x2 does not overflow with half max value", async () => {
    await contract.bigDiv2x2(
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      1,
      1,
      1
    );
    await contract.bigDiv2x2(
      1,
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      1,
      1
    );
    await contract.bigDiv2x2(
      1,
      1,
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      1
    );
    await contract.bigDiv2x2(
      1,
      1,
      1,
      maxValue
        .div(2)
        .dp(0)
        .toFixed()
    );
    await contract.bigDiv2x2(
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      maxValue
        .div(2)
        .dp(0)
        .toFixed(),
      maxValue
        .div(2)
        .dp(0)
        .toFixed()
    );
  });

  it("2x2 does not overflow with max value", async () => {
    await contract.bigDiv2x2(maxValue.toFixed(), 1, 1, 1);
    await contract.bigDiv2x2(maxValue.toFixed(), 1, maxValue.toFixed(), 1);
    await contract.bigDiv2x2(
      maxValue.toFixed(),
      maxValue.toFixed(),
      maxValue.toFixed(),
      1
    );
    await contract.bigDiv2x2(
      maxValue.toFixed(),
      maxValue.toFixed(),
      1,
      maxValue.toFixed()
    );
    await contract.bigDiv2x2(1, maxValue.toFixed(), 1, 1);
    await contract.bigDiv2x2(1, 1, maxValue.toFixed(), 1);
    await contract.bigDiv2x2(1, 1, 1, maxValue.toFixed());
  });
});
