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

function shouldBehaveLikeInvestCancel(alice, bob, carol) {
    const now = new BigNumber(dayjs().unix());
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const project = alice;
    const invest_bob = bob;
    const invest_carol = carol;
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);
    const amount = INVEST_SELL_BOB.toString(10);
    const amount1 = INVEST_SELL_CAROL.toString(10);

    beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
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

    describe("when the streamId exists", function() {
        describe("when caller is invest", function() {
            describe("when the proposalForCancelStatus is not 1", function() {
                describe("when the project is not start)", function() {
                    it("delete the streamId", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob },)
                        await truffleAssert.reverts(
                            this.DAISO.getStream(streamId, { from: invest_bob }),
                            "stream does not exist",
                        );
                    });

                    it("change the cancelProjectForInvests value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getCancelProjectForInvest(projectId, { from: invest_bob })
                        result.exitProjectFundBalance.should.be.bignumber.equal(0);
                        result.exitProjectSellBalance.should.be.bignumber.equal(0);
                        result.exitStartTime.should.be.bignumber.equal(startTime);
                    });

                    it("change the project value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getProject(projectId, { from: invest_bob })
                        result.projectActualFundDeposit.should.be.bignumber.equal(INVEST_SELL_CAROL);
                        result.projectActualSellDeposit.should.be.bignumber.equal(INVEST_FUND_CAROL);
                    });

                    it("transfer the projectFund token", async function() {
                        const balance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_SELL_BOB));
                    });

                    it("transfer the projectSell token", async function() {
                        const balance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance);
                    });

                    it("emits a invest event", async function() {
                        const result = await this.DAISO.cancelInvest(
                            streamId,
                            { from: invest_bob }
                        );
                        truffleAssert.eventEmitted(result, "CancelStream");
                    });
                });

                contextForStreamDidStartButNotEnd(function() {
                    const projectSellBalance = INVESTOR_STREAM_FOR_FIVE.multipliedBy(30).toString()
                    const projectFundBalance = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).toString()

                    it("delete the streamId", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob },)
                        await truffleAssert.reverts(
                            this.DAISO.getStream(streamId, { from: invest_bob }),
                            "stream does not exist",
                        );
                    });

                    it("change the cancelProjectForInvests value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getCancelProjectForInvest(projectId, { from: invest_bob })
                        result.exitProjectFundBalance.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(3));
                        result.exitProjectSellBalance.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(30));
                        result.exitStartTime.should.be.bignumber.equal(now.plus(STANDARD_TIME_OFFSET).plus(5));
                    });

                    it("change the project value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getProject(projectId, { from: invest_bob })
                        result.projectActualFundDeposit.should.be.bignumber.equal(INVEST_SELL_CAROL.plus(INVESTOR_STREAM_FOR_FIVE));
                        result.projectActualSellDeposit.should.be.bignumber.equal(INVEST_FUND_CAROL.plus(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10)));
                    });

                    it("transfer the projectFund token", async function() {
                        const balance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_SELL_BOB).minus(INVESTOR_STREAM_FOR_FIVE.multipliedBy(1)));
                    });

                    it("transfer the projectSell token", async function() {
                        const balance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10));
                    });

                    it("emits a invest event", async function() {
                        const result = await this.DAISO.cancelInvest(
                            streamId,
                            { from: invest_bob }
                        );
                        truffleAssert.eventEmitted(result, "CancelStream");
                    });
                });

                contextForStreamDidEnd(function() {
                    it("delete the streamId", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob },)
                        await truffleAssert.reverts(
                            this.DAISO.getStream(streamId, { from: invest_bob }),
                            "stream does not exist",
                        );
                    });

                    it("change the cancelProjectForInvests value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getCancelProjectForInvest(projectId, { from: invest_bob })
                        result.exitProjectFundBalance.should.be.bignumber.equal(0);
                        result.exitProjectSellBalance.should.be.bignumber.equal(0);
                        result.exitStartTime.should.be.bignumber.equal(startTime);
                    });

                    it("change the project value", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const result = await this.DAISO.getProject(projectId, { from: invest_bob })
                        result.projectActualFundDeposit.should.be.bignumber.equal(INVEST_SELL_BOB.plus(INVEST_SELL_CAROL));
                        result.projectActualSellDeposit.should.be.bignumber.equal(INVEST_FUND_BOB.plus(INVEST_FUND_CAROL));
                    });

                    it("transfer the projectFund token", async function() {
                        const balance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance);
                    });

                    it("transfer the projectSell token", async function() {
                        const balance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_FUND_BOB));
                    });

                    it("emits a invest event", async function() {
                        const result = await this.DAISO.cancelInvest(
                            streamId,
                            { from: invest_bob }
                        );
                        truffleAssert.eventEmitted(result, "CancelStream");
                    });
                });
            });
            describe("when the proposalForCancelStatus is 1", function() {

                contextForStreamDidStartButNotEnd(function() {
                    beforeEach(async function() {
                        await this.DAISO.test(projectId, { from: project });
                    });


                    it("delete the streamId", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob },)
                        await truffleAssert.reverts(
                            this.DAISO.getStream(streamId, { from: invest_bob }),
                            "stream does not exist",
                        );
                    });

                    it("transfer the projectFund token", async function() {
                        let sumForInvestSellDeposit = INVEST_SELL_BOB.plus(INVEST_SELL_CAROL)
                        let amount = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).multipliedBy(INVEST_SELL_BOB).dividedBy(sumForInvestSellDeposit)

                        const balance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_SELL_BOB).minus(INVESTOR_STREAM_FOR_FIVE).plus(amount));
                    });

                    it("transfer the projectSell token", async function() {
                        const balance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10));
                    });

                    it("emits a invest event", async function() {
                        const result = await this.DAISO.cancelInvest(
                            streamId,
                            { from: invest_bob }
                        );
                        truffleAssert.eventEmitted(result, "CancelProject");
                    });
                });

                contextForStreamDidEnd(function() {
                    beforeEach(async function() {
                        await this.DAISO.test(projectId, { from: project });
                    });

                    it("delete the streamId", async function() {
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob },)
                        await truffleAssert.reverts(
                            this.DAISO.getStream(streamId, { from: invest_bob }),
                            "stream does not exist",
                        );
                    });

                    it("transfer the projectFund token", async function() {
                        let sumForInvestSellDeposit = INVEST_SELL_BOB.plus(INVEST_SELL_CAROL)
                        let amount = INVEST_SELL_BOB.plus(INVEST_SELL_CAROL).multipliedBy(INVEST_SELL_BOB).dividedBy(sumForInvestSellDeposit)
                        console.log(sumForInvestSellDeposit)
                        console.log(amount)

                        const balance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.testDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(amount));
                    });

                    it("transfer the projectSell token", async function() {
                        const balance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                        const newBalance = await this.xtestDAI.balanceOf(invest_bob, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVEST_FUND_BOB));
                    });

                    it("emits a invest event", async function() {
                        const result = await this.DAISO.cancelInvest(
                            streamId,
                            { from: invest_bob }
                        );
                        truffleAssert.eventEmitted(result, "CancelProject");
                    });
                });
            });
        });

        describe("when caller is not invest", function() {
            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.cancelInvest(streamId, { from: project }),
                    "caller is not the sender of the invest stream",
                );
            });
        })
    });

    describe("when the streamId does not exist", function() {
        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.cancelInvest("1232", { from: invest_bob }),
                "stream does not exist",
            );
        });
    });
}

module.exports = shouldBehaveLikeInvestCancel;