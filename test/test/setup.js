const { chaiPlugin } = require("../node_modules/dev-utils");
const traveler = require("../node_modules/ganache-time-traveler");

const BigNumber = require("../node_modules/bignumber.js");
const chai = require("../node_modules/chai");
const chaiBigNumber = require("../node_modules/chai-bignumber");

chai.should();
chai.use(chaiBigNumber(BigNumber));
chai.use(chaiPlugin);

contract('Test',async (accounts) =>{
    let snapshotId;

    beforeEach(async() =>{
        const snapshot = await traveler.takeSnapshot();
        snapshotId = snapshot.result;
    })

    afterEach(async() =>{
        await traveler.revertToSnapshot(snapshotId);
    })
})