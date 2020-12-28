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

function shouldBehaveLikeLaunchProposal(alice, bob, carol) {
    const now = new BigNumber(dayjs().unix());
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const project = alice;
    const invest_bob = bob;
    const invest_carol = carol;
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);
    const projectFund = INVESTOR_STREAM_FOR_FIVE.toString(10);
    const amount = INVEST_SELL_BOB.toString(10);

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

        await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
        const result1 = await this.DAISO.createStream(
            projectId,
            amount,
            { from: invest_bob },
        );
        streamId = Number(result1.logs[0].args.streamId);
    });

    describe("when the project exists", function() {
        describe("when the caller is project sender", function() {
            describe("when the proposal is not exit", function() {
                describe("when the amount is valid", function() {
                    describe("one investor invest", function () {

                        contextForStreamDidStartButNotEnd(function() {

                            it("get proposal info", async function() {
                                await this.DAISO.launchProposal(projectId,projectFund, { from: project });
                                const result = await this.DAISO.getProposal(projectId, { from: project })
                                result.amount.should.be.bignumber.equal(projectFund);
                                result.startTime.should.be.bignumber.equal( now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                            });

                            it("returns the projectSellBalance of the stream", async function() {
                                await this.DAISO.launchProposal(projectId, projectFund, { from: project });

                                const result = await this.DAISO.getStream(streamId, { from: invest_bob })
                                result.voteForWight.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10));
                                result.voteResult.should.be.bignumber.equal(0);
                                result.isVote.should.be.bignumber.equal(0);
                            });
                        });
                    });

                    describe("two investors", function(){
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

                        contextForStreamDidStartButNotEnd(function() {
                            const projectFund = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).toString(10);

                            it("get proposal info", async function() {
                                await this.DAISO.launchProposal(projectId,projectFund, { from: project });
                                const result = await this.DAISO.getProposal(projectId, { from: project })
                                result.amount.should.be.bignumber.equal(projectFund);
                                result.startTime.should.be.bignumber.equal( now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                            });

                            it("returns the projectSellBalance of the streamId", async function() {
                                await this.DAISO.launchProposal(projectId, projectFund, { from: project });
                                const result = await this.DAISO.getStream(streamId, { from: invest_bob })
                                result.voteForWight.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10));
                                result.voteResult.should.be.bignumber.equal(0);
                                result.isVote.should.be.bignumber.equal(0);
                            });

                            it("returns the projectSellBalance of the streamId1", async function() {
                                await this.DAISO.launchProposal(projectId, projectFund, { from: project });
                                const result = await this.DAISO.getStream(streamId1, { from: invest_bob })
                                result.voteForWight.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(20));
                                result.voteResult.should.be.bignumber.equal(0);
                                result.isVote.should.be.bignumber.equal(0);
                            });
                        });
                    });

                    describe("one investor invest and one investor cancel", function () {
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

                            beforeEach(async function() {
                                await this.DAISO.cancelInvest(streamId, { from: invest_bob })
                                await this.DAISO.launchProposal(projectId,projectFund, { from: project });
                            });

                            it("get proposal info", async function() {
                                const result = await this.DAISO.getProposal(projectId, { from: project })
                                result.amount.should.be.bignumber.equal(projectFund);
                                result.startTime.should.be.bignumber.equal( now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                            });

                            afterEach(async function() {
                                await traveler.advanceBlockAndSetTime(now.toNumber());
                            })
                        });
                    });

                    describe("two investors invest and one cancel", function(){
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

                        contextForStreamDidStartButNotEnd(function() {
                            const projectFund = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).toString(10);

                            beforeEach(async function() {
                                await this.DAISO.cancelInvest(streamId1, { from: invest_carol })
                                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                                await this.DAISO.launchProposal(projectId,projectFund, { from: project });
                            });

                            it("get proposal info", async function() {
                                const result = await this.DAISO.getProposal(projectId, { from: project })
                                result.amount.should.be.bignumber.equal(projectFund);
                                result.startTime.should.be.bignumber.equal( now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber());
                            });

                            it("returns the projectSellBalance of the streamId", async function() {
                                const result = await this.DAISO.getStream(streamId, { from: invest_bob })
                                result.voteForWight.should.be.bignumber.equal(INVESTOR_STREAM_FOR_FIVE.multipliedBy(10));
                                result.voteResult.should.be.bignumber.equal(0);
                                result.isVote.should.be.bignumber.equal(0);
                            });
                        });
                    });
                });

                describe("when the amount is exceed balance", function() {
                    const projectFund = INVEST_SELL_BOB.plus(1).toString(10);
                    contextForStreamDidStartButNotEnd(function() {
                        it("revert", async function() {
                            await truffleAssert.reverts(
                                this.DAISO.launchProposal(projectId,projectFund, { from: project }),
                                "amount exceeds the available balance",
                            );
                        });
                    });
                })

                describe("when the amount is 0", function() {
                    contextForStreamDidStartButNotEnd(function() {
                        it("revert", async function() {
                            await truffleAssert.reverts(
                                this.DAISO.launchProposal(projectId,"0", { from: project }),
                                "amount is zero",
                            );
                        });
                    });
                })
            });

            describe("when the proposal is exit", function() {
                contextForStreamDidStartButNotEnd(function() {
                    it("revert", async function() {
                        await this.DAISO.launchProposal(projectId,projectFund, { from: project });
                        await truffleAssert.reverts(
                            this.DAISO.launchProposal(projectId,projectFund, { from: project }),
                            "The proposal is not finish",
                        );
                    });
                });
            });
        });

        describe("when the caller not is project sender", function() {
            contextForStreamDidStartButNotEnd(function() {

                it("revert", async function() {
                    await truffleAssert.reverts(
                        this.DAISO.launchProposal(projectId, projectFund, { from: invest_bob }),
                        "caller is not the sender of the project stream",
                    );
                });
            });
        });
    });

    describe("when the projectId does not exist", function() {
        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.launchProposal(1232, projectFund, { from: project }),
                "project does not exist",
            );
        });
    });
}

module.exports = shouldBehaveLikeLaunchProposal;