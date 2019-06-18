const { deployDat, shouldFail, updateDatConfig } = require('../../helpers');

contract('dat / erc20 / metadata', (accounts) => {
  const name = 'Token Name';
  const maxLengthName = 'Names are 64 characters max.....................................';
  let dat;
  let tx;

  before(async () => {
    dat = await deployDat({ name });
  });

  it('should have a name', async () => {
    assert.equal(await dat.name(), name);
  });

  it('can deploy with max length name', async () => {
    await deployDat({ name: maxLengthName });
  });

  it('should fail to deploy with a name longer than the max', async () => {
    await shouldFail(deployDat({ name: `${maxLengthName} more characters` }));
  });

  describe('updateName', () => {
    describe('`control` can change name', () => {
      const newName = 'New Name';

      before(async () => {
        tx = await updateDatConfig(dat, { name: newName });
      });

      it('should have the new name', async () => {
        assert.equal(await dat.name(), newName);
      });

      it('should emit an event', async () => {
        // TODO
        // const log = tx.logs[0];
        // assert.equal(log.event, 'NameUpdated');
        // assert.equal(log.args._previousName, name);
        // assert.equal(log.args._name, newName);
      });

      describe('max length', () => {
        before(async () => {
          tx = await updateDatConfig(dat, { name: maxLengthName });
        });

        it('should have the new name', async () => {
          assert.equal(await dat.name(), maxLengthName);
        });

        it('should fail to update longer than the max', async () => {
          await shouldFail(updateDatConfig(dat, { name: `${maxLengthName} more characters` }));
        });
      });
    });

    it('should fail to change name from a different account', async () => {
      await shouldFail(updateDatConfig(dat, { name: 'Test' }, accounts[2]), 'CONTROL_ONLY');
    });
  });
});
