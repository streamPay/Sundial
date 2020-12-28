const { devConstants,installment_mocha  } = require("dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs")
const truffleAssert = require("truffle-assertions");
const should = require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const traveler = require("ganache-time-traveler");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA,NUMBEROFINSTALLMENTS,FEESOFRECIPIENTPER } = devConstants;
const { streamStartOfOne } = installment_mocha;

function shouldBehaveLikeInstallBalanceOf(alice, bob, carol) {
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
            const result = await this.streamPayOfInstallment.createInstallmentStream(
                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,FEESOFRECIPIENTPER, opts);
            streamId = Number(result.logs[0].args.streamId);
        });

        describe("when the stream did not start", function() {
            it("returns the whole deposit for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(deposit / NUMBEROFINSTALLMENTS);
            });

            it("returns 0 for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });

        streamStartOfOne(function() {
            const streamedAmount = FIVE_UNITS.toString(10);
            const amount = new BigNumber(1200).multipliedBy(1e18);;

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    amount.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(streamedAmount, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });
        });


        describe("number of two",function() {
            const now = new BigNumber(dayjs().unix());
            const streamedAmount = FIVE_UNITS.multipliedBy(241).toString(10);
            const amount = new BigNumber(2400).multipliedBy(1e18);;

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallment.transferWithInstallment(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1201).toNumber(),);
            })

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    amount.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(streamedAmount, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });

        describe("number of three",function() {
            const now = new BigNumber(dayjs().unix());
            const streamedAmount = FIVE_UNITS.multipliedBy(481).toString(10);
            const amount = STANDARD_SALARY;

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallment.transferWithInstallment(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1201).toNumber(),);
                await this.streamPayOfInstallment.transferWithInstallment(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2401).toNumber(),);
            })

            it("returns the pro rata balance for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts);
                const tolerateByAddition = false;
                balance.should.tolerateTheBlockTimeVariation(
                    amount.minus(streamedAmount),
                    STANDARD_SCALE,
                    tolerateByAddition,
                );
            });

            it("returns the pro rata balance for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, recipient, opts);
                balance.should.tolerateTheBlockTimeVariation(streamedAmount, STANDARD_SCALE);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, carol, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallment.transferWithInstallment(streamId,opts),
                    truffleAssert.ErrorType.REVERT,
                );
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });


        describe("end",function() {
            const now = new BigNumber(dayjs().unix());

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallment.transferWithInstallment(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1201).toNumber(),);
                await this.streamPayOfInstallment.transferWithInstallment(streamId, {from:sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(3600).toNumber(),);
            })

            it("returns 0 for the sender of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts);
                balance.should.be.bignumber.equal(new BigNumber(0));
            });

            it("returns the whole deposit for the recipient of the stream", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, recipient, opts);
                balance.should.be.bignumber.equal(STANDARD_SALARY);
            });

            it("returns 0 for anyone else", async function() {
                const balance = await this.streamPayOfInstallment.installmentBalanceOf.call(streamId, carol, opts);
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
            await truffleAssert.reverts(this.streamPayOfInstallment.installmentBalanceOf.call(streamId, sender, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeInstallBalanceOf;