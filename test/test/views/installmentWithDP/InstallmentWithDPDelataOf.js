const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should()

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA,NUMBEROFINSTALLMENTS, feesOfRecipientPer} = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeInstallDeltaOf(alice, bob) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const deposit = STANDARD_SALARY.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
            await this.token.approve(this.streamPayOfInstallment.address, deposit, opts);
            const result = this.streamPayOfInstallment.createInstallmentStream(
                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,feesOfRecipientPer, opts);
            streamId = Number(result.logs[0].args.streamId);
        });

        describe("when the stream did not start", function() {
            it("returns 0", async function() {
                const delta = await this.streamPayOfInstallment.installmentDelataOf(streamId, opts);
                delta.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        contextForStreamDidStartButNotEnd(function() {
            it("returns the time the number of seconds that passed since the start time", async function() {
                const delta = await this.streamPayOfInstallment.installmentDelataOf(streamId, opts);
                delta.should.bignumber.satisfy(function(num) {
                    return num.isEqualTo(new BigNumber(5)) || num.isEqualTo(new BigNumber(5).plus(1));
                });
            });
        });

        contextForStreamDidEnd(function() {
            it("returns the difference between the stop time and the start time", async function() {
                const delta = await this.streamPayOfInstallment.installmentDelataOf(streamId, opts);
                delta.should.be.bignumber.equal(stopTime.minus(startTime));
            });
        });
    });

    describe("when the stream does not exist", function() {
        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfInstallment.installmentDelataOf(streamId, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeInstallDeltaOf;