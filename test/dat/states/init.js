const { deployDat } = require("../../helpers");

contract("dat / states / init", accounts => {
  let dat;

  before(async () => {
    dat = await deployDat(accounts);
  });

  it("beneficiary can transfer");
  it("beneficiary can not burn");
  it("holder can buy");
  it("holder can sell");
  it("holder can not transfer");
  it("holder can not burn");
});
