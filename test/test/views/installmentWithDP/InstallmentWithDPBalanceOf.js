const { devConstants,installment_mocha  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA,NUMBEROFINSTALLMENTS,FEESOFRECIPIENTPER,DOWNPAYMENTRATIO } = devConstants;
const { streamStartOfOne } = installment_mocha;

function shouldBehaveLikeInstallWithDPBalanceOf(alice, bob, carol) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        let streamId;
        const recipient = bob;
        const deposit = STANDARD_SALARY.dividedBy(0.8).toString(10);
        const firstPay = new BigNumber(2100).multipliedBy(1e18).toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
            await this.token.approve(this.streamPayOfInstallmentWithDP.address, deposit, opts);
            const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts);
            streamId = Number(result.logs[0].args.streamId);
        });

        describe("when the stream did not start", function() {
            it("returns the whole deposit for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(firstPay);
            });

            it("returns 0 for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        streamStartOfOne(function() {
            const streamedAmount = FIVE_UNITS.toString(10);
            const amount = new BigNumber(1200).multipliedBy(1e18);
            const actualRecipientBalance = new BigNumber(905).multipliedBy(1e18);;

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    amount.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(actualRecipientBalance, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });


        describe("number of two",function() {
            const now = new BigNumber(dayjs().unix());
            const streamedAmount = FIVE_UNITS.multipliedBy(241).toString(10);
            const amount = new BigNumber(2400).multipliedBy(1e18);

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
            })

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    amount.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const actualRecipientBalance = new BigNumber(2105).multipliedBy(1e18).toString();
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(actualRecipientBalance, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });

        describe("number of three",function() {
            const now = new BigNumber(dayjs().unix());
            const streamedAmount = FIVE_UNITS.multipliedBy(481).toString(10);
            const amount = STANDARD_SALARY.dividedBy(0.8).toString(10);

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2400).toNumber(),);
            })

            it("returns the pro rata balance for the sender of the stream", async function() {
                const actualSenderBalance = new BigNumber(1195).multipliedBy(1e18).toString();

                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    actualSenderBalance,
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const actualRecipientBalance = new BigNumber(3305).multipliedBy(1e18).toString();
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(actualRecipientBalance, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.transferWithDP(streamId,opts),
                    truffleAssert.ErrorType.REVERT,
                );
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });


        describe("end",function() {
            const now = new BigNumber(dayjs().unix());
            const amount = STANDARD_SALARY.dividedBy(0.8).toString(10);

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(3600).toNumber(),);
            })

            it("returns 0 for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns the whole deposit for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(amount);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });
    });

    describe("when the stream does not exist", function() {
        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(streamId, sender, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeInstallWithDPBalanceOf;