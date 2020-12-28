const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs")
const truffleAssert = require("truffle-assertions");
const should = require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const traveler = require("ganache-time-traveler");

const {
    PROJECT_SELL,
    PROJECT_FUND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    INVEST_SELL_BOB,
    INVEST_FUND_BOB,
    INVEST_SELL_CAROL,
    INVEST_FUND_CAROL,
    INVESTOR_STREAM_FOR_FIVE  //bob5秒sellDeposit的流动量
} = devConstants;
const { contextForStreamDidEnd, contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeProjectBalanceOf(alice, bob, carol) {
    const now = new BigNumber(dayjs().unix());
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const project = alice;
    const invest_bob = bob;
    const invest_carol = carol;
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);

    beforeEach(async function() {
        await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10), { from: project });
        const result = await this.DAISO.createProject(
            this.xtestDAI.address,
            sellDeposit,
            this.testDAI.address,
            fundDeposit,
            startTime,
            stopTime,
            hash,
            { from: project }
        );
        projectId = Number(result.logs[0].args.projectId);
    });

    describe("when the stream exists", function() {
        describe("when have one investor invest", function () {
            const amount = INVEST_SELL_BOB.toString(10);

            beforeEach(async function() {
                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
                const result1 = await this.DAISO.createStream(
                    projectId,
                    amount,
                    { from: invest_bob },
                );
                streamId = Number(result1.logs[0].args.streamId);
            });

            describe("when the stream did not start", function() {
                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB);
                });

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(0);
                });
            });

            contextForStreamDidStartButNotEnd(function() {
                const projectFund = INVESTOR_STREAM_FOR_FIVE.toString(10);
                const projectSell = INVESTOR_STREAM_FOR_FIVE.multipliedBy(10).toString()

                it("returns projectFundBalance for the sender of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(projectFund);
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB.minus(projectSell));
                });
            });

            contextForStreamDidEnd(function() {
                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(new BigNumber(0));
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(INVEST_SELL_BOB);
                });
            });
        });

        describe("when have two investors invest", function(){
            const amount = INVEST_SELL_BOB.toString(10);
            const amount1 = INVEST_SELL_CAROL.toString(10);

            beforeEach(async function() {
                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
                const result1 = await this.DAISO.createStream(
                    projectId,
                    amount,
                    { from: invest_bob },
                );
                streamId = Number(result1.logs[0].args.streamId);

                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_CAROL.toString(10), { from: invest_carol });
                const result2 = await this.DAISO.createStream(
                    projectId,
                    amount1,
                    { from: invest_carol },
                );
                streamId1 = Number(result2.logs[0].args.streamId);
            });

            describe("when the stream did not start", function() {
                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB.plus(INVEST_FUND_CAROL));
                });

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(0);
                });
            });

            contextForStreamDidStartButNotEnd(function() {
                const projectFund = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).toString(10);
                const projectSell = INVESTOR_STREAM_FOR_FIVE.multipliedBy(30).toString()

                it("returns projectFundBalance for the sender of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(projectFund);
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB.plus(INVEST_FUND_CAROL).minus(projectSell));
                });
            });

            contextForStreamDidEnd(function() {
                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(new BigNumber(0));
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(INVEST_SELL_BOB.plus(INVEST_SELL_CAROL));
                });
            });
        });

        describe("when one investor invest and one investor cancel", function () {
            const amount = INVEST_SELL_BOB.toString(10);

            beforeEach(async function() {
                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
                const result1 = await this.DAISO.createStream(
                    projectId,
                    amount,
                    { from: invest_bob },
                );
                streamId = Number(result1.logs[0].args.streamId);

            });

            describe("when the stream did not start", function() {
                beforeEach(async function() {
                    // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(0);
                });

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(0);
                });
            });

            contextForStreamDidStartButNotEnd(function() {
                const projectFund = INVESTOR_STREAM_FOR_FIVE.toString(10);

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(30).toNumber());
                });

                it("returns projectFundBalance for the sender of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(projectFund);
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(0);
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());
                })
            });

            contextForStreamDidEnd(function() {
                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET)
                        .plus(STANDARD_TIME_DELTA)
                        .plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                });

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId);
                    balance.projectSellBalance.should.be.bignumber.equal(0);
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId);
                    balance.projectFundBalance.should.be.bignumber.equal(INVEST_SELL_BOB);
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());
                })
            });
        });

        describe("when two investors invest and one cancel", function(){
            const amount = INVEST_SELL_BOB.toString(10);
            const amount1 = INVEST_SELL_CAROL.toString(10);

            beforeEach(async function() {
                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
                const result1 = await this.DAISO.createStream(
                    projectId,
                    amount,
                    { from: invest_bob },
                );
                streamId = Number(result1.logs[0].args.streamId);

                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_CAROL.toString(10), { from: invest_carol });
                const result2 = await this.DAISO.createStream(
                    projectId,
                    amount1,
                    { from: invest_carol },
                );
                streamId1 = Number(result2.logs[0].args.streamId);
            });

            describe("when the stream did not start", function() {
                beforeEach(async function() {
                    // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId1, { from: invest_carol })
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB);
                });

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(0);
                });
            });

            contextForStreamDidStartButNotEnd(function() {

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId1, { from: invest_carol })
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(10).toNumber());
                });

                it("returns projectFundBalance for the sender of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(4));
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB.minus(INVESTOR_STREAM_FOR_FIVE.multipliedBy(20)));
                });
            });

            contextForStreamDidEnd(function() {
                const projectFund_CAROL = INVESTOR_STREAM_FOR_FIVE.multipliedBy(2).toString(10);

                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                    await this.DAISO.cancelInvest(streamId1, { from: invest_carol })
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(3601).toNumber());
                });


                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(new BigNumber(0));

                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(INVEST_SELL_BOB.plus(projectFund_CAROL));
                });
            });
        });

        describe("when project loss arbitration", function () {
            const amount = INVEST_SELL_BOB.toString(10);

            beforeEach(async function() {
                await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
                const result1 = await this.DAISO.createStream(
                    projectId,
                    amount,
                    { from: invest_bob },
                );
                streamId = Number(result1.logs[0].args.streamId);
            });

            contextForStreamDidStartButNotEnd(function() {
                const projectFund = INVESTOR_STREAM_FOR_FIVE.toString(10);
                const projectSell = INVESTOR_STREAM_FOR_FIVE.multipliedBy(10).toString()

                beforeEach(async function() {
                    await this.DAISO.test(projectId, { from: project })
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(10).toNumber());

                })

                it("returns projectFundBalance for the sender of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(projectFund);
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(INVEST_FUND_BOB.minus(projectSell));
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());

                })
            });

            contextForStreamDidEnd(function() {
                beforeEach(async function() {
                    await this.DAISO.test(projectId, { from: project })
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(3610).toNumber());

                })

                it("returns the projectFundBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectSellBalance.should.be.bignumber.equal(new BigNumber(0));
                });

                it("returns the projectSellBalance of the stream", async function() {
                    const balance = await this.DAISO.projectBalanceOf(projectId, { from: invest_bob });
                    balance.projectFundBalance.should.be.bignumber.equal(INVEST_SELL_BOB);
                });

                afterEach(async function() {
                    await traveler.advanceBlockAndSetTime(now.toNumber());

                })
            });
        });
    });
}

module.exports = shouldBehaveLikeProjectBalanceOf;