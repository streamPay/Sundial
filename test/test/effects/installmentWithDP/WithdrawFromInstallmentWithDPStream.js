const { devConstants,installment_mocha  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");

const { streamStartOfOne} = installment_mocha;


const {
    STANDARD_SCALE,
    STANDARD_SALARY,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    NUMBEROFINSTALLMENTS,
    FEESOFRECIPIENTPER,
    DOWNPAYMENTRATIO,
    FIVE_UNITS,
} = devConstants;

function shouldBehaveLikeInstallmentWithDPWithdrawStream(alice, bob, eve) {
    const now = new BigNumber(dayjs().unix());
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    describe("when the stream exists",function() {
        beforeEach(async function() {
            this.sender = alice;
            this.recipient = bob;
            this.deposit = STANDARD_SALARY.toString(10);
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
        });

        describe("when the caller is the recipient of the stream", function() {

            beforeEach(function() {
                this.opts = { from: this.recipient };
            });

            // describe("when feesOfProtocolPer is 0",function() {
            //     const feesOfProtocolPer = new BigNumber(0).toString();
            //     beforeEach(async function() {
            //         await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
            //     })
            //     runTests(feesOfProtocolPer);
            // });

            describe("when feesOfProtocolPer is not 0",function() {
                const feesOfProtocolPer = new BigNumber(1000000).toString();
                beforeEach(async function() {
                    await this.streamPayOfInstallmentWithDP.updateFeesOfProtocolPer(feesOfProtocolPer,{from:alice});
                })
                runTests(feesOfProtocolPer);
            });
        });

        describe("when the caller is the sender of the stream", function() {
            const opts = { from: alice };

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, FIVE_UNITS, opts),
                    "caller is not the the recipient of the stream",
                );
            });
        });

        describe("when the caller is not the sender or the recipient of the stream", function() {
            const opts = { from: eve };

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, FIVE_UNITS, opts),
                    "caller is not the the recipient of the stream",
                );
            });
        });
    });

    describe("when the stream does not exist", function() {
        const recipient = bob;
        const opts = { from: recipient };

        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(streamId, FIVE_UNITS, opts), "stream does not exist");
        });
    });
}

function runTests(feesOfProtocolPer) {
    describe("when not paused", function() {
        describe("when the withdrawal amount is higher than 0", function() {
            describe("when the stream did not start", function() {
                const withdrawalAmount = FIVE_UNITS.toString(10);

                it("reverts", async function() {
                    await truffleAssert.reverts(
                        this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                        "amount exceeds the available balance",
                    );
                });
            });

            streamStartOfOne(function() {
                describe("when the withdrawal amount does not exceeds the available balance",function() {
                    const withdrawalAmount = FIVE_UNITS.toString(10);
                    const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 5;

                    it("withdraws from the stream", async function() {
                        const balance = await this.token.balanceOf(this.recipient);
                        await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                        const newBalance = await this.token.balanceOf(this.recipient);
                        newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount - feesOfRrotocol));
                    });

                    it("emits a withdrawfromstream event", async function() {
                        const result = await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                        truffleAssert.eventEmitted(result, "WithdrawFromInstallmentWithDPStream");
                    });

                    it("decreases the stream balance", async function() {
                        const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                        await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                        const newBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                        // Intuitively, one may say we don't have to tolerate the block time variation here.
                        // However, the Sablier balance for the recipient can only go up from the bottom
                        // low of `balance` - `amount`, due to uncontrollable runtime costs.
                        newBalance.should.tolerateTheBlockTimeVariation(balance.minus(withdrawalAmount), STANDARD_SCALE);
                    });

                    it("getearnings",async function() {
                        const balance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                        await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                        const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                        balance.should.be.bignumber.equal(newBalance.minus(feesOfRrotocol));
                    });
                });

                describe("when the withdrawal amount exceeds the available balance",function() {
                    it("reverts", async function() {
                        const withdrawalAmount = FIVE_UNITS.multipliedBy(1000).toString(10);

                        await truffleAssert.reverts(
                            this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                            "amount exceeds the available balance",
                        );
                    });
                });
            });

            describe("number of two",async function() {
                const now = new BigNumber(dayjs().unix());
                const withdrawalAmount = FIVE_UNITS.multipliedBy(336).toString(10);
                const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 1680;

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                    await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                })

                it("withdraws from the stream", async function() {
                    const balance = await this.token.balanceOf(this.recipient);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.token.balanceOf(this.recipient);
                    newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount - feesOfRrotocol));
                });

                it("emits a withdrawfromstream event", async function() {
                    const result = await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    truffleAssert.eventEmitted(result, "WithdrawFromInstallmentWithDPStream");
                });

                it("decreases the stream balance", async function() {
                    const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                    // Intuitively, one may say we don't have to tolerate the block time variation here.
                    // However, the Sablier balance for the recipient can only go up from the bottom
                    // low of `balance` - `amount`, due to uncontrollable runtime costs.
                    newBalance.should.tolerateTheBlockTimeVariation(balance.minus(withdrawalAmount), STANDARD_SCALE);
                });

                it("getearnings",async function() {
                    const balance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                    balance.should.be.bignumber.equal(newBalance.minus(feesOfRrotocol));
                })

                it("reverts", async function() {
                    const withdrawalAmount = FIVE_UNITS.multipliedBy(1000).toString(10);

                    await truffleAssert.reverts(
                        this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                        "amount exceeds the available balance",
                    );
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());
                })
            });

            describe("number of three",async function() {
                const now = new BigNumber(dayjs().unix());
                const withdrawalAmount = FIVE_UNITS.multipliedBy(528).toString(10);
                const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 2640;

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                    await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                    await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2400).toNumber(),);
                })

                it("withdraws from the stream", async function() {
                    const balance = await this.token.balanceOf(this.recipient);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.token.balanceOf(this.recipient);
                    newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount - feesOfRrotocol));

                });

                it("emits a withdrawfromstream event", async function() {
                    const result = await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    truffleAssert.eventEmitted(result, "WithdrawFromInstallmentWithDPStream");
                });

                it("decreases the stream balance", async function() {
                    const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                    // Intuitively, one may say we don't have to tolerate the block time variation here.
                    // However, the Sablier balance for the recipient can only go up from the bottom
                    // low of `balance` - `amount`, due to uncontrollable runtime costs.
                    newBalance.should.tolerateTheBlockTimeVariation(balance.minus(withdrawalAmount), STANDARD_SCALE);
                });

                it("getearnings",async function() {
                    const balance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                    await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                    const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                    balance.should.be.bignumber.equal(newBalance.minus(feesOfRrotocol));
                })

                it("reverts", async function() {
                    const withdrawalAmount = FIVE_UNITS.multipliedBy(1000).toString(10);

                    await truffleAssert.reverts(
                        this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                        "amount exceeds the available balance",
                    );
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());
                })
            });


            describe("end",async function() {
                const now = new BigNumber(dayjs().unix());

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                    await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                    await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(3600).toNumber(),);
                })

                describe("when the withdrawal amount does not exceed the available balance", function() {
                    describe("when the balance is not withdrawn in full", function() {
                        const withdrawalAmount = STANDARD_SALARY.dividedBy(2).toString(10);
                        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 1800;

                        it("withdraws from the stream", async function() {
                            const balance = await this.token.balanceOf(this.recipient);
                            await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.token.balanceOf(this.recipient);
                            newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount - feesOfRrotocol));
                        });

                        it("emits a withdrawfromstream event", async function() {
                            const result = await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            truffleAssert.eventEmitted(result, "WithdrawFromInstallmentWithDPStream");
                        });

                        it("decreases the stream balance", async function() {
                            const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                            await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId, this.recipient, this.opts);
                            // Intuitively, one may say we don't have to tolerate the block time variation here.
                            // However, the Sablier balance for the recipient can only go up from the bottom
                            // low of `balance` - `amount`, due to uncontrollable runtime costs.
                            newBalance.should.tolerateTheBlockTimeVariation(balance.minus(withdrawalAmount), STANDARD_SCALE);
                        });

                        it("getearnings",async function() {
                            const balance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                            await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.streamPayOfInstallmentWithDP.getEarnings.call(this.token.address,this.opts);
                            balance.should.be.bignumber.equal(newBalance.minus(feesOfRrotocol));
                        })
                    });

                    describe("when the balance is withdrawn in full", function() {
                        const withdrawalAmount = STANDARD_SALARY.toString(10);
                        const feesOfRrotocol = STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfProtocolPer * 3600;

                        it("withdraws from the stream", async function() {
                            const balance = await this.token.balanceOf(this.recipient);
                            await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.token.balanceOf(this.recipient);
                            newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount - feesOfRrotocol));
                        });

                        it("emits a withdrawfromstream event", async function() {
                            const result = await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            truffleAssert.eventEmitted(result, "WithdrawFromInstallmentWithDPStream");
                        });

                        it("deletes the stream object", async function() {
                            await this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts);
                            await truffleAssert.reverts(this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(this.streamId), "stream does not exist");
                        });
                    });
                });

                describe("when the withdrawal amount exceeds the available balance", function() {
                    const withdrawalAmount = STANDARD_SALARY.plus(FIVE_UNITS).toString(10);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                            "amount exceeds the available balance",
                        );
                    });
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());
                })
            });
        });

        describe("when the withdrawal amount is zero", function() {
            const withdrawalAmount = new BigNumber(0).toString(10);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                    "amount is zero",
                );
            });
        });
    });

    describe("when paused", function() {
        const withdrawalAmount = FIVE_UNITS.toString(10);

        beforeEach(async function() {
            // Note that `sender` coincides with the owner of the contract
            await this.streamPayOfInstallmentWithDP.pause({ from: this.sender });
        });

        it("reverts", async function() {
            await truffleAssert.reverts(
                this.streamPayOfInstallmentWithDP.withdrawInstallmentWithDPStream(this.streamId, withdrawalAmount, this.opts),
                "Pausable: paused",
            );
        });
    });
}



module.exports = shouldBehaveLikeInstallmentWithDPWithdrawStream;