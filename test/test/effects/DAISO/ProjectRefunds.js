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

function shouldBehaveLikeProjectRefunds(alice, bob) {
    const now = new BigNumber(dayjs().unix());
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const project = alice;
    const invest_bob = bob;
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);
    const amount = INVEST_SELL_BOB.toString(10);

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
    });

    describe("when the projectId exists", function() {
        describe("when caller is project", function() {
            describe("when the block.timestamp is bigger than project stoptime",function() {
                describe("when the project stream is normal finished(no arbitration loss)", function() {
                    it("project refunds with no arbitration loss, and transfer to project", async function() {
                        const balance = await this.xtestDAI.balanceOf(project, { from: project });
                        await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(31536000).toNumber());
                        await this.DAISO.projectRefunds(projectId, { from: project })
                        const newBalance = await this.xtestDAI.balanceOf(project, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(sellDeposit).minus(INVEST_FUND_BOB));
                    });

                    it("project refunds with no arbitration loss, and transfer to project", async function() {
                        const balance = await this.testDAI.balanceOf(project, { from: project });
                        await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(31536000).toNumber());
                        await this.DAISO.projectRefunds(projectId, { from: project })
                        const newBalance = await this.testDAI.balanceOf(project, { from: project });
                        newBalance.should.be.bignumber.equal(INVEST_SELL_BOB);
                    });
                });

                contextForStreamDidStartButNotEnd(function() {
                    const projectSell = INVESTOR_STREAM_FOR_FIVE.multipliedBy(10).toString()

                    it("project refunds with arbitration loss,  and transfer to project", async function() {
                        await this.DAISO.test(projectId, { from: project })
                        const balance = await this.xtestDAI.balanceOf(project, { from: project });
                        await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(31536000).toNumber());
                        await this.DAISO.projectRefunds(projectId, { from: project })
                        const newBalance = await this.xtestDAI.balanceOf(project, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(sellDeposit).minus(projectSell));
                    });

                    it("project refunds with arbitration loss,  and transfer to project", async function() {
                        await this.DAISO.test(projectId, { from: project })
                        const balance = await this.testDAI.balanceOf(project, { from: project });
                        await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(31536000).toNumber());
                        await this.DAISO.projectRefunds(projectId, { from: project })
                        const newBalance = await this.testDAI.balanceOf(project, { from: project });
                        newBalance.should.be.bignumber.equal(balance.plus(INVESTOR_STREAM_FOR_FIVE));
                    });
                });
            });

            describe("when the block.timestamp is smaller than project stoptime",function() {
                it("reverts", async function() {
                    await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).toNumber());
                    await truffleAssert.reverts(
                        this.DAISO.projectRefunds(projectId, { from: project }),
                        "now is smaller than stopTime",
                    );
                });
            })
        })

        describe("when caller is not project", function() {
            it("reverts", async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(1).toNumber());

                await truffleAssert.reverts(
                    this.DAISO.projectRefunds(projectId, { from: invest_bob }),
                    "caller is not the sender of the project stream",
                );
            });
        })
    });

    describe("when the projectId does not exist", function() {
        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.projectRefunds("1232", { from: project }),
                "project does not exist",
            );
        });
    });
}

module.exports = shouldBehaveLikeProjectRefunds;