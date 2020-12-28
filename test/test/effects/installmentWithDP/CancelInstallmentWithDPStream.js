const { devConstants,installment_mocha  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");


const {
    STANDARD_SCALE,
    STANDARD_SALARY,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    NUMBEROFINSTALLMENTS,
    FEESOFRECIPIENTPER,
    FIVE_UNITS,
    DOWNPAYMENTRATIO,
} = devConstants;

const { streamStartOfOne} = installment_mocha;

function runTests(feesOfProtocolPer) {

    describe("when the stream did not start", function() {
        it("cancels the stream", async function() {
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
        });

        it("transferWithDPs all tokens to the sender of the stream", async function() {
            const balance = await this.token.balanceOf(this.sender, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.sender, this.opts);
            newBalance.should.be.bignumber.equal(balance.plus(this.deposit * 0.2 + this.deposit * 0.8 / NUMBEROFINSTALLMENTS));
        });

        it("emits a cancel event", async function() {
            const result = await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            truffleAssert.eventEmitted(result, "CancelInstallmentWithDPStream");
        });
    });

    streamStartOfOne(function() {
        const streamedAmount = FIVE_UNITS.toString(10);
        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 905;
        const now = new BigNumber(dayjs().unix());

        it("increase the getEarnings",async function() {
            const balance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address);
            newBalance.should.be.bignumber.equal(balance.plus(feesOfRrotocol));
        });

        it("cancels the stream", async function() {
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
        });

        it("transferWithDPs the tokens to the sender of the stream", async function() {
            const balance = await this.token.balanceOf(this.sender, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.sender, this.opts);
            const tolerateByAddition = false;

            newBalance.should.tolerateTheBlockTimeVariation(
                balance.minus(streamedAmount).plus(this.deposit * 0.8 / NUMBEROFINSTALLMENTS),
                STANDARD_SCALE,
                tolerateByAddition,
            );
        });

        it("transferWithDPs the tokens to the recipient of the stream", async function() {
            const recipientBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,this.recipient,this.opts);

            const balance = await this.token.balanceOf(this.recipient, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.recipient, this.opts);

            // console.log(this.deposit.multipliedBy(0.2).plus(streamedAmount));
            newBalance.should.tolerateTheBlockTimeVariation(balance.plus(recipientBalance - feesOfRrotocol), STANDARD_SCALE);
        });

        it("emits a cancel event", async function() {
            const result = await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            truffleAssert.eventEmitted(result, "CancelInstallmentWithDPStream");
        });
    });

    describe("number og two",function() {
        const now = new BigNumber(dayjs().unix());
        const streamedAmount = FIVE_UNITS.multipliedBy(241).toString(10);
        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 2105;
        beforeEach(async function() {
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
            await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
        })

        it("increase the getEarnings",async function() {
            const balance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            newBalance.should.be.bignumber.equal(balance.plus(feesOfRrotocol));
        });

        it("cancels the stream", async function() {
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
        });

        it("transferWithDPs the tokens to the sender of the stream", async function() {
            const balance = await this.token.balanceOf(this.sender, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.sender, this.opts);
            const tolerateByAddition = false;
            newBalance.should.tolerateTheBlockTimeVariation(
                balance.minus(streamedAmount).plus(this.deposit * 0.8 / NUMBEROFINSTALLMENTS * 2),
                STANDARD_SCALE,
                tolerateByAddition,
            );
        });

        it("transferWithDPs the tokens to the recipient of the stream", async function() {
            const recipientBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,this.recipient,this.opts);
            const balance = await this.token.balanceOf(this.recipient, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.recipient, this.opts);
            newBalance.should.tolerateTheBlockTimeVariation(balance.plus(recipientBalance - feesOfRrotocol), STANDARD_SCALE);
        });

        it("emits a cancel event", async function() {
            const result = await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            truffleAssert.eventEmitted(result, "CancelInstallmentWithDPStream");
        });

        afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
        })
    });

    describe("number og three",function() {
        const now = new BigNumber(dayjs().unix());
        const streamedAmount = FIVE_UNITS.multipliedBy(481).toString(10);
        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 3305;

        beforeEach(async function() {
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
            await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
            await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2400).toNumber(),);
        })

        it("cancels the stream", async function() {
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
        });

        it("transferWithDPs the tokens to the sender of the stream", async function() {
            const balance = await this.token.balanceOf(this.sender, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.sender, this.opts);
            const tolerateByAddition = false;
            newBalance.should.tolerateTheBlockTimeVariation(
                balance.minus(streamedAmount).plus(this.deposit * 0.8),
                STANDARD_SCALE,
                tolerateByAddition,
            );
        });

        it("transferWithDPs the tokens to the recipient of the stream", async function() {
            const recipientBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,this.recipient,this.opts);

            const balance = await this.token.balanceOf(this.recipient, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.recipient, this.opts);
            newBalance.should.tolerateTheBlockTimeVariation(balance.plus(recipientBalance - feesOfRrotocol), STANDARD_SCALE);
        });

        it("increase the getEarnings",async function() {
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2400).toNumber(),);

            const balance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            newBalance.should.be.bignumber.equal(balance.plus(feesOfRrotocol));
        });

        it("emits a cancel event", async function() {
            const result = await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            truffleAssert.eventEmitted(result, "CancelInstallmentWithDPStream");
        });

        afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
        })
    });

    describe("end",function() {
        const now = new BigNumber(dayjs().unix());
        const streamedAmount = STANDARD_SALARY.toString(10);
        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 4500;

        beforeEach(async function() {
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
            await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
            await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(3600).toNumber(),);
        })

        it("cancels the stream", async function() {
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
        });

        it("transferWithDPs the tokens to the sender of the stream", async function() {
            const balance = await this.token.balanceOf(this.sender, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.sender, this.opts);
            const tolerateByAddition = false;
            newBalance.should.tolerateTheBlockTimeVariation(
                balance.minus(streamedAmount).plus(this.deposit * 0.8),
                STANDARD_SCALE,
                tolerateByAddition,
            );
        });

        it("transferWithDPs the tokens to the recipient of the stream", async function() {
            const recipientBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,this.recipient,this.opts);

            const balance = await this.token.balanceOf(this.recipient, this.opts);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.token.balanceOf(this.recipient, this.opts);
            newBalance.should.tolerateTheBlockTimeVariation(balance.plus(recipientBalance - feesOfRrotocol), STANDARD_SCALE);
        });

        it("increase the getEarnings",async function() {
            const balance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings(this.token.address);
            newBalance.should.be.bignumber.equal(balance.plus(feesOfRrotocol));
        });

        it("emits a cancel event", async function() {
            const result = await this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, this.opts);
            truffleAssert.eventEmitted(result, "CancelInstallmentWithDPStream");
        });

        afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
        })
    });
}

function shouldBehaveLikeInstallmentWithDPCancelStream(alice, bob, eve) {
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);
        beforeEach(async function() {
            this.sender = alice;
            this.recipient = bob;
            this.deposit = STANDARD_SALARY.dividedBy(0.8).toString(10);
            const opts = { from: this.sender };
            await this.token.approve(this.streamPayOfInstallmentWithDP.address, this.deposit, opts);
            const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                this.recipient,
                this.deposit,
                this.token.address,
                startTime,
                stopTime,
                NUMBEROFINSTALLMENTS,
                DOWNPAYMENTRATIO,
                FEESOFRECIPIENTPER,
                opts,
            );
            this.streamId = Number(result.logs[0].args.streamId);
            const streamObject = await this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(Number(result.logs[0].args.streamId));



        });

        describe("when the caller is the sender of the stream", function() {
            beforeEach(function() {
                this.opts = { from: this.sender };
            });

            describe("when feesOfProtocolPer is 0",function() {
                const feesOfProtocolPer = new BigNumber(0).toString();
                beforeEach(async function() {
                    await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
                })
                runTests(feesOfProtocolPer);
            });

            describe("when feesOfProtocolPer is not 0",function() {
                const feesOfProtocolPer = new BigNumber(1000000).toString();
                beforeEach(async function() {
                    await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
                })
                runTests(feesOfProtocolPer);
            });
        });

        describe("when the caller is the recipient of the stream", function() {
            beforeEach(function() {
                this.opts = { from: this.recipient };
            });

            describe("when feesOfProtocolPer is 0",function() {
                const feesOfProtocolPer = new BigNumber(0).toString();
                beforeEach(async function() {
                    await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
                })
                runTests(feesOfProtocolPer);
            });

            describe("when feesOfProtocolPer is not 0",function() {
                const feesOfProtocolPer = new BigNumber(1000000).toString();
                beforeEach(async function() {
                    await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
                })
                runTests(feesOfProtocolPer);
            });
        });

        describe("when the caller is not the sender or the recipient of the stream", function() {
            const opts = { from: eve };

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(this.streamId, opts),
                    "caller is not the sender or the recipient of the stream",
                );
            });
        });
    });

    describe("when the stream does not exist", function() {
        const recipient = bob;
        const opts = { from: recipient };

        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.cancelInstallmentWithDPStream(streamId, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeInstallmentWithDPCancelStream;