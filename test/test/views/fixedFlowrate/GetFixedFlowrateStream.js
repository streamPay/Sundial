const BigNumber = require("../../../node_modules/bignumber.js");
const truffleAssert = require("../../../node_modules/truffle-assertions");

function shouldBehaveLikeFixedFlowrateGetStream(alice) {
    const sender = alice;
    const opts = { from: sender };

    describe("when the stream does not exist", function() {
        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfFixedFlowrate.getFixedFlowrateStream(streamId, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeFixedFlowrateGetStream;