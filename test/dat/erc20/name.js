const { deployDat, shouldFail } = require('../../helpers');

contract('dat / erc20 / metadata', (accounts) => {
  const name = 'Token Name';
  const maxLengthName = 'Names are 32 characters max.....';
  let dat;
  let tx;

  before(async () => {
    dat = await deployDat({ name });
  });

  it('should have a name', async () => {
    assert.equal(await dat.name(), name);
  });

  it('should fail to deploy with a name longer than the max', async () => {
    console.log(await deployDat({ name: `${maxLengthName} more characters` }));
    await shouldFail(deployDat({ name: `${maxLengthName} more characters` }));
  });

  describe('updateName', () => {
    describe('`control` can change name', () => {
      const newName = 'New Name';

      before(async () => {
        tx = await dat.updateName(newName);
      });

      it('should have the new name', async () => {
        assert.equal(await dat.name(), newName);
      });

      it('should emit an event', async () => {
        const log = tx.logs[0];
        assert.equal(log.event, 'NameUpdated');
        assert.equal(log.args._previousName, name);
        assert.equal(log.args._name, newName);
      });

      describe('max length', () => {
        before(async () => {
          tx = await dat.updateName(maxLengthName);
        });

        it('should have the new name', async () => {
          assert.equal(await dat.name(), maxLengthName);
        });

        it('should fail to update longer than the max', async () => {
          await shouldFail(dat.updateName(`${maxLengthName} more characters`));
        });
      });
    });

    it('should fail to change name from a different account', async () => {
      await shouldFail(dat.updateName('Test', { from: accounts[2] }), 'CONTROL_ONLY');
    });
  });
});
