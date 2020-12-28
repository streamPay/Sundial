const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();

const {
    STANDARD_RATE_PER_SECOND,
    STANDARD_SALARY,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    ZERO_ADDRESS,
    NUMBEROFINSTALLMENTS,
    FEESOFRECIPIENTPER,
    DOWNPAYMENTRATIO,
} = devConstants;

function shouldBehaveLikeInstallmentWithDPStream(alice, bob) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());

    describe("when not paused", function() {
        describe("when the recipient is valid", function() {
            const recipient = bob;

            describe("when the contract has enough allowance", function() {
                beforeEach(async function() {
                    await this.token.approve(this.streamPayOfInstallmentWithDP.address, STANDARD_SALARY.toString(10), opts);
                });

                describe("when the sender has enough tokens", function() {
                    describe("when the deposit is valid", function() {
                        const deposit = STANDARD_SALARY.toString(10);

                        describe("when the numberofinstallments is valid",function() {
                            describe("when the start time is after block.timestamp", function() {
                                describe("when the stop time is after the start time", function() {
                                    describe("when the DOWNPAYMENTRATIO is valid",function() {
                                        describe("when the FEESOFRECIPIENTPER is 0",function() {
                                            const startTime = now.plus(STANDARD_TIME_OFFSET);
                                            const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                                            const installmentAmountWithFees = STANDARD_SALARY.multipliedBy(0.8).toString();

                                            it("creates the stream", async function() {
                                                const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient,
                                                    deposit,
                                                    this.token.address,
                                                    startTime,
                                                    stopTime,
                                                    NUMBEROFINSTALLMENTS,
                                                    DOWNPAYMENTRATIO,
                                                    FEESOFRECIPIENTPER,
                                                    opts,
                                                );
                                                const streamObject = await this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(Number(result.logs[0].args.streamId));
                                                streamObject.sender.should.be.equal(sender);
                                                streamObject.recipient.should.be.equal(recipient);
                                                streamObject.deposit.should.be.bignumber.equal(deposit);
                                                streamObject.downPaymentRatio.should.be.bignumber.equal(DOWNPAYMENTRATIO);
                                                streamObject.tokenAddress.should.be.equal(this.token.address);
                                                streamObject.startTime.should.be.bignumber.equal(startTime);
                                                streamObject.stopTime.should.be.bignumber.equal(stopTime);
                                                streamObject.numberOfInstallments.should.be.bignumber.equal(NUMBEROFINSTALLMENTS);
                                                streamObject.feesOfRecipientPer.should.be.bignumber.equal(FEESOFRECIPIENTPER);
                                                streamObject.ratePerSecond.should.be.bignumber.equal(installmentAmountWithFees / STANDARD_TIME_DELTA);
                                                streamObject.haveBeenNumberOfInstallment.should.be.bignumber.equal(1);
                                            });

                                            it("transfers the tokens to the contract", async function() {
                                                const balance = await this.token.balanceOf(sender, opts);
                                                await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts);
                                                const newBalance = await this.token.balanceOf(sender, opts);
                                                newBalance.should.be.bignumber.equal(balance.minus(STANDARD_SALARY * 0.2 + installmentAmountWithFees / NUMBEROFINSTALLMENTS));
                                            });

                                            it("increases the stream next stream id", async function() {
                                                const nextStreamId = await this.streamPayOfInstallmentWithDP.nextStreamId();
                                                await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts);
                                                const newNextStreamId = await this.streamPayOfInstallmentWithDP.nextStreamId();
                                                newNextStreamId.should.be.bignumber.equal(nextStreamId.plus(1));
                                            });

                                            it("emits a stream event", async function() {
                                                const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient,
                                                    deposit,
                                                    this.token.address,
                                                    startTime,
                                                    stopTime,
                                                    NUMBEROFINSTALLMENTS,
                                                    DOWNPAYMENTRATIO,
                                                    FEESOFRECIPIENTPER,
                                                    opts,
                                                );
                                                truffleAssert.eventEmitted(result, "CreateInstallmentWithDPStream");
                                            });
                                        });

                                        describe("when the feesOfRecipientPer is not 0",function() {
                                            const startTime = now.plus(STANDARD_TIME_OFFSET);
                                            const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                                            const feesOfRecipientPer = new BigNumber(1000000).toString(10);
                                            const fees = new BigNumber(STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfRecipientPer * 2880).toString(10);
                                            const installmentAmountWithFees = STANDARD_SALARY.multipliedBy(0.8).plus(fees).toString(10);

                                            beforeEach(async function() {
                                                await this.token.approve(this.streamPayOfInstallmentWithDP.address, installmentAmountWithFees, opts);
                                            });

                                            it("creates the stream", async function() {
                                                const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient,
                                                    deposit,
                                                    this.token.address,
                                                    startTime,
                                                    stopTime,
                                                    NUMBEROFINSTALLMENTS,
                                                    DOWNPAYMENTRATIO,
                                                    feesOfRecipientPer,
                                                    opts,
                                                );
                                                const streamObject = await this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(Number(result.logs[0].args.streamId));
                                                streamObject.sender.should.be.equal(sender);
                                                streamObject.recipient.should.be.equal(recipient);
                                                streamObject.deposit.should.be.bignumber.equal(deposit);
                                                streamObject.downPaymentRatio.should.be.bignumber.equal(DOWNPAYMENTRATIO);
                                                streamObject.tokenAddress.should.be.equal(this.token.address);
                                                streamObject.startTime.should.be.bignumber.equal(startTime);
                                                streamObject.stopTime.should.be.bignumber.equal(stopTime);
                                                streamObject.numberOfInstallments.should.be.bignumber.equal(NUMBEROFINSTALLMENTS);
                                                streamObject.feesOfRecipientPer.should.be.bignumber.equal(feesOfRecipientPer);
                                                streamObject.ratePerSecond.should.be.bignumber.equal(installmentAmountWithFees / STANDARD_TIME_DELTA);
                                                streamObject.haveBeenNumberOfInstallment.should.be.bignumber.equal(1);
                                            });

                                            it("transfers the tokens to the contract", async function() {
                                                const NUMBEROFINSTALLMENTS = 10;
                                                const fees = new BigNumber(STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfRecipientPer * 2880).toString(10);
                                                const installmentAmountWithFees = STANDARD_SALARY.multipliedBy(0.8).plus(fees).toString(10);

                                                const balance = await this.token.balanceOf(sender, opts);
                                                await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,feesOfRecipientPer, opts);
                                                const newBalance = await this.token.balanceOf(sender, opts);

                                                newBalance.should.be.bignumber.equal(balance.minus(STANDARD_SALARY * 0.2 + installmentAmountWithFees / NUMBEROFINSTALLMENTS));
                                            });

                                            it("emits a stream event", async function() {
                                                const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient,
                                                    deposit,
                                                    this.token.address,
                                                    startTime,
                                                    stopTime,
                                                    NUMBEROFINSTALLMENTS,
                                                    DOWNPAYMENTRATIO,
                                                    feesOfRecipientPer,
                                                    opts,
                                                );
                                                truffleAssert.eventEmitted(result, "CreateInstallmentWithDPStream");
                                            });
                                        });
                                    });

                                    describe("when the DOWNPAYMENTRATIO is valid",function() {
                                        const startTime = now.plus(STANDARD_TIME_OFFSET);
                                        const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                                        const downPaymentRatio = new BigNumber(101).toString(10);

                                        it("reverts", async function() {
                                            await truffleAssert.reverts(
                                                this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                    recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,downPaymentRatio,FEESOFRECIPIENTPER, opts),
                                                "fee percentage higher than 100%",
                                            );
                                        });
                                    })
                                });

                                describe("when the stop time is not after the start time", function() {
                                    let startTime;
                                    let stopTime;

                                    beforeEach(async function() {
                                        startTime = now.plus(STANDARD_TIME_OFFSET);
                                        stopTime = startTime;
                                    });

                                    it("reverts", async function() {
                                        await truffleAssert.reverts(
                                            this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                            "stop time before the start time",
                                        );
                                    });
                                });
                            });

                            describe("when the start time is not after block.timestamp", function() {
                                let startTime;
                                let stopTime;

                                beforeEach(async function() {
                                    startTime = now.minus(STANDARD_TIME_OFFSET);
                                    stopTime = startTime.plus(STANDARD_TIME_DELTA);
                                });

                                it("reverts", async function() {
                                    await truffleAssert.reverts(
                                        this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                            recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                        "start time before block.timestamp",
                                    );
                                });
                            });
                        });

                        describe("when the numberofinstallments is not valid",function() {
                            const startTime = now.plus(STANDARD_TIME_OFFSET);
                            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                            it("reverts",async function() {
                                const numberofinstallments = new BigNumber(0).toString(10);
                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,numberofinstallments,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    truffleAssert.ErrorType.REVERT,
                                );
                            });

                            it("reverts",async function() {
                                const numberofinstallments = new BigNumber(1).toString(10);

                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,numberofinstallments,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    truffleAssert.ErrorType.REVERT,
                                );
                            });

                            it("reverts",async function() {
                                const numberofinstallments = new BigNumber(7).toString(10);

                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,numberofinstallments,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    "duration % numberOfInstallments have remainder",
                                );
                            });

                            it("reverts",async function() {
                                const numberofinstallments = new BigNumber(3601).toString(10);

                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,numberofinstallments,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    "duration < numberOfInstallmentStream",
                                );
                            });
                        })
                    });

                    describe("when the deposit is not valid", function() {
                        const startTime = now.plus(STANDARD_TIME_OFFSET);
                        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                        describe("when the deposit is zero", function() {
                            const deposit = new BigNumber(0).toString(10);

                            it("reverts", async function() {
                                truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    "deposit is zero",
                                );
                            });
                        });

                        describe("when the deposit is smaller than the time delta", function() {
                            const deposit = STANDARD_TIME_DELTA.minus(1).toString(10);

                            it("reverts", async function() {
                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    "deposit smaller than time delta",
                                );
                            });
                        });

                        describe("when the deposit is smaller than the NUMBEROFINSTALLMENTS", function() {
                            const deposit = new BigNumber(2).toString(10);

                            it("reverts", async function() {
                                await truffleAssert.reverts(
                                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                                    "numberOfInstallments bigger than deposit",
                                );
                            });
                        });
                    });
                });

                describe("when the sender does not have enough tokens", function() {
                    const deposit = STANDARD_SALARY.multipliedBy(50).toString(10);
                    const startTime = now.plus(STANDARD_TIME_OFFSET);
                    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                            truffleAssert.ErrorType.REVERT,
                        );
                    });
                });
            });

            describe("when the contract does not have enough allowance", function() {
                let startTime;
                let stopTime;

                beforeEach(async function() {
                    startTime = now.plus(STANDARD_TIME_OFFSET);
                    stopTime = startTime.plus(STANDARD_TIME_DELTA);
                    await this.token.approve(this.streamPayOfInstallmentWithDP.address, 1, opts);
                });

                describe("when the sender has enough tokens", function() {
                    const deposit = STANDARD_SALARY.toString(10);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                            truffleAssert.ErrorType.REVERT,
                        );
                    });
                });

                describe("when the sender does not have enough tokens", function() {
                    const deposit = STANDARD_SALARY.multipliedBy(50).toString(10);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                            truffleAssert.ErrorType.REVERT,
                        );
                    });
                });
            });
        });

        describe("when the recipient is the caller itself", function() {
            const recipient = sender;
            const deposit = STANDARD_SALARY.toString(10);
            const startTime = now.plus(STANDARD_TIME_OFFSET);
            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                    "stream to the caller",
                );
            });
        });

        describe("when the recipient is the contract itself", function() {
            const deposit = STANDARD_SALARY.toString(10);
            const startTime = now.plus(STANDARD_TIME_OFFSET);
            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

            it("reverts", async function() {
                // Can't be defined in the context above because "this.sablier" is undefined there
                const recipient = this.streamPayOfInstallmentWithDP.address;

                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                    "stream to the contract",
                );
            });
        });

        describe("when the recipient is the zero address", function() {
            const recipient = ZERO_ADDRESS;
            const deposit = STANDARD_SALARY.toString(10);
            const startTime = now.plus(STANDARD_TIME_OFFSET);
            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                        recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                    "stream to the zero address",
                );
            });
        });
    });

    describe("when paused", function() {
        const recipient = bob;
        const deposit = STANDARD_SALARY.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
            // Note that `sender` coincides with the owner of the contract
            await this.streamPayOfInstallmentWithDP.pause({from:sender});
        });

        it("reverts", async function() {
            await truffleAssert.reverts(
            this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
                recipient, deposit, this.token.address, startTime, stopTime,NUMBEROFINSTALLMENTS,DOWNPAYMENTRATIO,FEESOFRECIPIENTPER, opts),
                "Pausable: paused",
            );
        });
    });
}

module.exports = shouldBehaveLikeInstallmentWithDPStream;