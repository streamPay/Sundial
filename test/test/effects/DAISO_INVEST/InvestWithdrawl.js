const { devConstants,mochaContexts  } = require("dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs")
const truffleAssert = require("truffle-assertions");
const should = require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const traveler = require("ganache-time-traveler");
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

const {
    PROJECT_SELL,
    PROJECT_FUND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    INVEST_SELL_BOB,
    INVEST_FUND_BOB,
    INVEST_BOB_WITHDRAWL,
} = devConstants;

function runTests() {
    describe("when not paused", function() {
        describe("when the withdrawal amount is higher than 0", function() {
            describe("when the project not start", function() {
                const withdrawalAmount = INVEST_BOB_WITHDRAWL.toString(10);

                it("reverts", async function() {
                    await truffleAssert.reverts(
                        this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts),
                        "amount exceeds the available balance",
                    );
                });
            });

            contextForStreamDidStartButNotEnd(function() {
                describe("when the withdrawal amount does not exceed the available balance", function() {
                    const withdrawalAmount = INVEST_BOB_WITHDRAWL.toString(10);

                    it("withdraws from the stream", async function() {
                        const balance = await this.xtestDAI.balanceOf(this.invest_bob);
                        await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                        const newBalance = await this.xtestDAI.balanceOf(this.invest_bob);
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_BOB_WITHDRAWL));
                    });


                    it("decreases the stream balance", async function() {
                        const balance = await this.DAISO.investBalanceOf(this.streamId, this.opts);
                        await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                        const newBalance = await this.DAISO.investBalanceOf(this.streamId, this.opts);
                        // Intuitively, one may say we don't have to tolerate the block time variation here.
                        // However, the Sablier balance for the recipient can only go up from the bottom
                        // low of `balance` - `amount`, due to uncontrollable runtime costs.
                        newBalance.investFundBalance.should.be.bignumber.equal(balance.investFundBalance.minus(withdrawalAmount));
                    });

                    it("increases the withdrawl amount", async function() {
                        const stream = await this.DAISO.getStream(this.streamId, this.opts);
                        await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                        const newStream = await this.DAISO.getStream(this.streamId, this.opts);
                        // Intuitively, one may say we don't have to tolerate the block time variation here.
                        // However, the Sablier balance for the recipient can only go up from the bottom
                        // low of `balance` - `amount`, due to uncontrollable runtime costs.
                        newStream.investWithdrawalAmount.should.be.bignumber.equal(stream.investWithdrawalAmount.plus(withdrawalAmount));
                    });
                });

                describe("when the withdrawal amount exceeds the available balance", function() {
                    const withdrawalAmount = INVEST_BOB_WITHDRAWL.multipliedBy(2).toString(10);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts),
                            "amount exceeds the available balance",
                        );
                    });
                });
            });

            contextForStreamDidEnd(function() {
                describe("when the withdrawal amount does not exceed the available balance", function() {
                    describe("when the balance is not withdrawn in full", function() {
                        const withdrawalAmount = INVEST_FUND_BOB.dividedBy(2).toString(10);

                        it("withdraws from the stream", async function() {
                            const balance = await this.xtestDAI.balanceOf(this.invest_bob);
                            await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.xtestDAI.balanceOf(this.invest_bob);
                            newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount));
                        });


                        it("decreases the stream balance", async function() {
                            const balance = await this.DAISO.investBalanceOf(this.streamId);
                            await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.DAISO.investBalanceOf(this.streamId);
                            newBalance.investFundBalance.should.be.bignumber.equal(balance.investFundBalance.minus(withdrawalAmount));
                        });

                        it("increases the withdrawl amount", async function() {
                            const stream = await this.DAISO.getStream(this.streamId, this.opts);
                            await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                            const newStream = await this.DAISO.getStream(this.streamId, this.opts);
                            // Intuitively, one may say we don't have to tolerate the block time variation here.
                            // However, the Sablier balance for the recipient can only go up from the bottom
                            // low of `balance` - `amount`, due to uncontrollable runtime costs.
                            newStream.investWithdrawalAmount.should.be.bignumber.equal(stream.investWithdrawalAmount.plus(withdrawalAmount));
                        });
                    });

                    describe("when the balance is withdrawn in full", function() {
                        const withdrawalAmount = INVEST_FUND_BOB.toString(10);

                        it("withdraws from the stream", async function() {
                            const balance = await this.xtestDAI.balanceOf(this.invest_bob);
                            await this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts);
                            const newBalance = await this.xtestDAI.balanceOf(this.invest_bob);
                            newBalance.should.be.bignumber.equal(balance.plus(withdrawalAmount));
                        });
                    });
                });

                describe("when the withdrawal amount exceeds the available balance", function() {
                    const withdrawalAmount = INVEST_FUND_BOB.plus(1).toString(10);

                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts),
                            "amount exceeds the available balance",
                        );
                    });
                });
            });
        });

        describe("when the withdrawal amount is zero", function() {
            const withdrawalAmount = new BigNumber(0).toString(10);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts),
                    "amount is zero",
                );
            });
        });
    });

    describe("when paused", function() {
        const withdrawalAmount = INVEST_FUND_BOB.toString(10);

        beforeEach(async function() {
            // Note that `sender` coincides with the owner of the contract
            await this.DAISO.pause({ from: this.project });
        });

        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.withdrawFromInvest(this.streamId, withdrawalAmount, this.opts),
                "Pausable: paused",
            );
        });
    });
}

function shouldBehaveLikeInvestWithdrawl(alice, bob, carol) {
    const now = new BigNumber(dayjs().unix());

    describe("when the stream exists", function() {
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
            const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
            this.project = alice;
            this.invest_bob = bob;
            const sellDeposit = PROJECT_SELL.toString(10);
            const fundDeposit = PROJECT_FUND.toString(10);
            await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10), { from: this.project });
            const result = await this.DAISO.createProject(
                this.xtestDAI.address,
                sellDeposit,
                this.testDAI.address,
                fundDeposit,
                startTime,
                stopTime,
                hash,
                { from: this.project }
            );
            this.projectId = Number(result.logs[0].args.projectId);

            const amount = INVEST_SELL_BOB.toString(10);
            await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: this.invest_bob });
            const result1 = await this.DAISO.createStream(
                this.projectId,
                amount,
                { from: this.invest_bob },
            );
            this.streamId = Number(result1.logs[0].args.streamId);
        });

        describe("when the caller is the sender of the stream", function() {
            beforeEach(function() {
                this.opts = { from: this.invest_bob };
            });

            runTests();
        });

        describe("when the caller is not the sender of the stream", function() {
            const opts = { from: carol };

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.withdrawFromInvest(this.streamId, INVEST_BOB_WITHDRAWL, opts),
                    "caller is not the sender of the invest stream",
                );
            });
        });
    });

    describe("when the stream does not exist", function() {
        const recipient = bob;
        const opts = { from: recipient };

        it("reverts", async function() {
            const streamId = new BigNumber(419863);
            await truffleAssert.reverts(this.DAISO.withdrawFromInvest(streamId, INVEST_BOB_WITHDRAWL, opts), "stream does not exist");
        });
    });
}

module.exports = shouldBehaveLikeInvestWithdrawl;
