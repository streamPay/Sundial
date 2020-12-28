const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA,STANDARD_RATE_PER_SECOND } = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeFixedFlowrateBalanceOf(alice, bob, carol) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const maxAmount = STANDARD_SALARY.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const ratePersecond = STANDARD_RATE_PER_SECOND.toString(10);

        beforeEach(async function() {
            await this.token.approve(this.streamPayOfFixedFlowrate.address, maxAmount, opts);
            const result = await this.streamPayOfFixedFlowrate.createFixedFlowrateStream(recipient, maxAmount, this.token.address, ratePersecond, startTime, opts);
            streamId = Number(result.logs[0].args.streamId);
        });

        describe("when the stream did not start", function() {
            it("returns the whole maxAmount for the sender of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(maxAmount);
            });

            it("returns 0 for the recipient of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        contextForStreamDidStartButNotEnd(function() {
            const streamedAmount = FIVE_UNITS.toString(10);

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    STANDARD_SALARY.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(streamedAmount, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        contextForStreamDidEnd(function() {
            it("returns 0 for the sender of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns the whole maxAmount for the recipient of the stream", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(STANDARD_SALARY);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });
    });

    describe("when the stream does not exist", function() {
        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfFixedFlowrate.fixedFlowrateBalanceOf.call(streamId, sender, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeFixedFlowrateBalanceOf;