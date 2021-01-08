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

function shouldBehaveLikeVotingResult(alice, bob, carol) {
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
    const projectFund = INVESTOR_STREAM_FOR_FIVE.multipliedBy(3).toString(10);
    const lockPeriod = 10000;

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
            lockPeriod,
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

    describe("when the stream exists", function() {
        describe("when the caller is project sender", function() {
            describe("when the proposal is exit", function() {
                beforeEach(async function() {
                    await traveler.advanceBlockAndSetTime(now
                        .plus(STANDARD_TIME_OFFSET)
                        .plus(5)
                        .toNumber());
                    await this.DAISO.launchProposal(projectId, projectFund, { from: project });
                })

                describe("when the project not loss arbitration", function() {
                    describe("when the vote is finished", function() {
                        describe("two investors", function(){
                            contextForStreamDidStartButNotEnd(function() {
                                describe("no people vote",function() {
                                    it("no people vote", async function() {
                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        const balance = await this.testDAI.balanceOf(project, { from: project })
                                        await this.DAISO.votingResult(projectId, { from: project });
                                        const nweBalance = await this.testDAI.balanceOf(project, { from: project })
                                        nweBalance.should.be.bignumber.equal( balance.plus(projectFund));
                                    });
                                });

                                describe("one people vote,success",function() {
                                    it("one people vote,success", async function() {
                                        await this.DAISO.voteForInvest(streamId, 1, { from: invest_bob })
                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        const balance = await this.testDAI.balanceOf(project, { from: project })
                                        await this.DAISO.votingResult(projectId, { from: project });
                                        const nweBalance = await this.testDAI.balanceOf(project, { from: project })
                                        nweBalance.should.be.bignumber.equal( balance.plus(projectFund));
                                    });

                                    it("one people vote,failure", async function() {
                                        await this.DAISO.voteForInvest(streamId, 2, { from: invest_bob })
                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        const balance = await this.testDAI.balanceOf(project, { from: project })
                                        await this.DAISO.votingResult(projectId, { from: project });
                                        const nweBalance = await this.testDAI.balanceOf(project, { from: project })
                                        nweBalance.should.be.bignumber.equal( balance);
                                    });

                                    it("withdraw amount is increase", async function() {
                                        await this.DAISO.voteForInvest(streamId, 1, { from: invest_bob })
                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        await this.DAISO.votingResult(projectId, { from: project });

                                        const result = await this.DAISO.getProject(projectId, { from: project })
                                        result.projectWithdrawalAmount.should.be.bignumber.equal(projectFund);
                                    });
                                });

                                describe("two people vote,success",function() {
                                    it("streamId is pass, streamId1 is notPass", async function() {
                                        await this.DAISO.voteForInvest(streamId, 1, { from: invest_bob })
                                        await this.DAISO.voteForInvest(streamId1, 2, { from: invest_carol })

                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        const balance = await this.testDAI.balanceOf(project, { from: project })
                                        await this.DAISO.votingResult(projectId, { from: project });
                                        const nweBalance = await this.testDAI.balanceOf(project, { from: project })
                                        nweBalance.should.be.bignumber.equal( balance);
                                    });

                                    it("streamId1 is pass, streamId is notPass", async function() {
                                        await this.DAISO.voteForInvest(streamId, 2, { from: invest_bob })
                                        await this.DAISO.voteForInvest(streamId1, 1, { from: invest_carol })
                                        await traveler.advanceBlockAndSetTime(now
                                            .plus(STANDARD_TIME_OFFSET)
                                            .plus(86405)
                                            .toNumber());
                                        const balance = await this.testDAI.balanceOf(project, { from: project })
                                        await this.DAISO.votingResult(projectId, { from: project });
                                        const nweBalance = await this.testDAI.balanceOf(project, { from: project })
                                        nweBalance.should.be.bignumber.equal( balance.plus(projectFund));
                                    });

                                });
                            });
                        });
                    });

                    describe("when the vote is not finished", function() {
                        it("reverts", async function() {
                            await traveler.advanceBlockAndSetTime(now
                                .plus(STANDARD_TIME_OFFSET)
                                .plus(604)
                                .toNumber());


                            await truffleAssert.reverts(
                                this.DAISO.votingResult(projectId, { from: project }),
                                "25",
                            );
                        });
                    })
                });

                // describe("when the project loss arbitration", function() {
                //     it("reverts", async function() {
                //         await this.DAISO.test(projectId, { from: project })
                //         await traveler.advanceBlockAndSetTime(now
                //             .plus(STANDARD_TIME_OFFSET)
                //             .plus(86405)
                //             .toNumber());
                //         await truffleAssert.reverts(
                //             this.DAISO.votingResult(projectId, { from: project }),
                //             "project loss arbitration",
                //         );
                //     });
                // });
            });

            describe("when the proposal is not exit", function() {
                it("reverts", async function() {
                    await traveler.advanceBlockAndSetTime(now
                        .plus(STANDARD_TIME_OFFSET)
                        .plus(86405)
                        .toNumber());

                    await truffleAssert.reverts(
                        this.DAISO.votingResult(projectId, { from: project }),
                        "22",
                    );
                });
            });
        });

        describe("when caller is not project", function() {
            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.projectRefunds(projectId, { from: invest_bob }),
                    "2",
                );
            });
        })
    });
    describe("when the projectId does not exist", function() {
        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.projectRefunds("1232", { from: project }),
                "4",
            );
        });
    });
}

module.exports = shouldBehaveLikeVotingResult;