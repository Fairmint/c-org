const { deployDat } = require("../../datHelpers");
const { approveAll } = require("../../helpers");

// Source: https://github.com/OpenZeppelin/openzeppelin-contracts

const { BN } = require("@openzeppelin/test-helpers");

const {
  shouldBehaveLikeERC20Burnable,
} = require("./behaviors/ERC20Burnable.behavior");

contract("ERC20Burnable", function (accounts) {
  const [owner, ...otherAccounts] = accounts;
  const initialBalance = new BN(1000);

  beforeEach(async function () {
    const contracts = await deployDat(accounts, {
      initGoal: 0,
      beneficiary: owner,
      initReserve: initialBalance.toString(),
    });
    await approveAll(contracts, accounts);
    this.token = contracts.dat;
  });

  shouldBehaveLikeERC20Burnable(owner, initialBalance, otherAccounts);
});
