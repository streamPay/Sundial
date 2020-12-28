const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should()

const { STANDARD_RATE_PER_SECOND,STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeFixedFlowrateDeltaOf(alice, bob) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const maxAmount = STANDARD_SALARY.toString(10);
        const ratePersecond = STANDARD_RATE_PER_SECOND.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const maxStopTime = startTime.plus(STANDARD_SALARY / STANDARD_RATE_PER_SECOND);

        beforeEach(async function() {
            await this.token.approve(this.streamPayOfFixedFlowrate.address, maxAmount, opts);
            const result = await this.streamPayOfFixedFlowrate.createFixedFlowrateStream(recipient, maxAmount, this.token.address, ratePersecond, startTime, opts);
            streamId = Number(result.logs[0].args.streamId);
        });

        describe("when the stream did not start", function() {
            it("returns 0", async function() {
                const delta = await this.streamPayOfFixedFlowrate.fixedFlowrateDeltaOf(streamId, opts);
                delta.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        contextForStreamDidStartButNotEnd(function() {
            it("returns the time the number of seconds that passed since the start time", async function() {
                const delta = await this.streamPayOfFixedFlowrate.fixedFlowrateDeltaOf(streamId, opts);
                delta.should.bignumber.satisfy(function(num) {
                    return num.isEqualTo(new BigNumber(5)) || num.isEqualTo(new BigNumber(5).plus(1));
                });
            });
        });

        contextForStreamDidEnd(function() {
            it("returns the difference between the stop time and the start time", async function() {
                const delta = await this.streamPayOfFixedFlowrate.fixedFlowrateDeltaOf(streamId, opts);
                delta.should.be.bignumber.equal(maxStopTime.minus(startTime));
            });
        });
    });

    describe("when the stream does not exist", function() {
        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfFixedFlowrate.fixedFlowrateDeltaOf(streamId, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeFixedFlowrateDeltaOf;