const { devConstants,mochaContexts  } = require("dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs")
const truffleAssert = require("truffle-assertions");
const should = require('chai')
    .use(require('chai-bignumber')(BigNumber))
    .should();
const traveler = require("ganache-time-traveler");

const {
    INVEST_SELL_BOB_RATE_PER_SECOND,
    INVEST_FUND_BOB_RATE_PER_SECOND,
    INVEST_SELL_CAROL_RATE_PER_SECOND,
    INVEST_FUND_CAROL_RATE_PER_SECOND,
    PROJECT_SELL,
    PROJECT_FUND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    INVEST_SELL_BOB,
    INVEST_SELL_CAROL,
    INVEST_FUND_BOB,
    INVEST_FUND_CAROL
} = devConstants;

function shouldBehaveLikeCreateStream(alice, bob, carol) {
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const project = alice;
    const invest_bob = bob;
    const invest_carol = carol;
    const now = new BigNumber(dayjs().unix());
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const lockPeriod = 100;
    describe("when not paused", async function() {
        console.log(1)
        await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10), { from: project });
        console.log(2)
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
        console.log(result)
        this.projectId = Number(result.logs[0].args.projectId);
        console.log(this.projectId)

        // describe("when the contract has enough allowance", function() {
        //     beforeEach(async function() {
        //         await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
        //         await this.testDAI.approve(this.DAISO.address, INVEST_SELL_CAROL.toString(10), { from: invest_carol });
        //     });

            // describe("when the sender has enough tokens", function() {
            //     describe("when the deposit is valid", function() {
            //         describe("when the start time is after block.timestamp", function() {
            //             describe("when the now before the start time", function() {
            //                 describe("The first people invest", function() {
            //                     const amount = INVEST_SELL_BOB.toString(10);
            //                     it("creates the stream", async function() {
            //                         const result = await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },
            //                         );
            //
            //                         const streamObject = await this.DAISO.getStream(Number(result.logs[0].args.streamId));
            //                         streamObject.projectId.should.be.bignumber.equal(this.projectId);
            //                         streamObject.investSellDeposit.should.be.bignumber.equal(INVEST_SELL_BOB);
            //                         streamObject.investFundDeposit.should.be.bignumber.equal(INVEST_FUND_BOB);
            //                         streamObject.sender.should.be.equal(bob);
            //                         streamObject.investWithdrawalAmount.should.be.bignumber.equal(0);
            //                         streamObject.ratePerSecondOfInvestSell.should.be.bignumber.equal(INVEST_SELL_BOB_RATE_PER_SECOND);
            //                         streamObject.ratePerSecondOfInvestFund.should.be.bignumber.equal(INVEST_FUND_BOB_RATE_PER_SECOND);
            //                     });
            //
            //                     it("transfers the tokens to the contract", async function() {
            //                         const balance = await this.testDAI.balanceOf(bob, { from: invest_bob });
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },);
            //                         const newBalance = await this.testDAI.balanceOf(bob, { from: invest_bob });
            //                         newBalance.should.be.bignumber.equal(balance.minus(INVEST_SELL_BOB));
            //                     });
            //
            //                     it("change project value", async function() {
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },);
            //                         const projectObject = await this.DAISO.getProject(this.projectId);
            //                         projectObject.projectActualSellDeposit.should.be.bignumber.equal(INVEST_FUND_BOB);
            //                         projectObject.projectActualFundDeposit.should.be.bignumber.equal(INVEST_SELL_BOB);
            //                     });
            //
            //                     it("increases the next stream id", async function() {
            //                         const nextStreamId = await this.DAISO.nextStreamId();
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },
            //                         );
            //                         const newNextStreamId = await this.DAISO.nextStreamId();
            //                         newNextStreamId.should.be.bignumber.equal(nextStreamId.plus(1));
            //                     });
            //
            //                     it("emits a stream event", async function() {
            //                         const result = await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },
            //                         );
            //                         truffleAssert.eventEmitted(result, "CreateStream");
            //                     });
            //                 });
            //
            //                 describe("The second people invest", function() {
            //                     const amount = INVEST_SELL_CAROL.toString(10);
            //                     const invest_sell = INVEST_SELL_CAROL.plus(INVEST_SELL_BOB)
            //                     const invest_fund = INVEST_FUND_CAROL.plus(INVEST_FUND_BOB)
            //
            //                     beforeEach(async function() {
            //                         await this.testDAI.approve(this.DAISO.address, INVEST_SELL_BOB.toString(10), { from: invest_bob });
            //                         const result = await this.DAISO.createStream(
            //                             this.projectId,
            //                             INVEST_SELL_BOB,
            //                             { from: invest_bob },
            //                         );
            //
            //                         this.streamId = Number(result.logs[0].args.streamId);
            //                     });
            //
            //                     it("creates the stream", async function() {
            //                         const result = await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_carol },
            //                         );
            //
            //                         const streamObject = await this.DAISO.getStream(Number(result.logs[0].args.streamId));
            //                         streamObject.projectId.should.be.bignumber.equal(this.projectId);
            //                         streamObject.investSellDeposit.should.be.bignumber.equal(INVEST_SELL_CAROL);
            //                         streamObject.investFundDeposit.should.be.bignumber.equal(INVEST_FUND_CAROL);
            //                         streamObject.sender.should.be.equal(carol);
            //                         streamObject.investWithdrawalAmount.should.be.bignumber.equal(0);
            //                         streamObject.ratePerSecondOfInvestSell.should.be.bignumber.equal(INVEST_SELL_CAROL_RATE_PER_SECOND);
            //                         streamObject.ratePerSecondOfInvestFund.should.be.bignumber.equal(INVEST_FUND_CAROL_RATE_PER_SECOND);
            //                     });
            //
            //                     it("transfers the tokens to the contract", async function() {
            //                         const balance = await this.testDAI.balanceOf(carol, { from: invest_carol });
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_carol },);
            //                         const newBalance = await this.testDAI.balanceOf(carol, { from: invest_carol });
            //                         newBalance.should.be.bignumber.equal(balance.minus(INVEST_SELL_CAROL));
            //                     });
            //
            //                     it("change project value", async function() {
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_carol },);
            //                         const projectObject = await this.DAISO.getProject(this.projectId);
            //                         projectObject.projectActualSellDeposit.should.be.bignumber.equal(invest_fund);
            //                         projectObject.projectActualFundDeposit.should.be.bignumber.equal(invest_sell);
            //                     });
            //
            //                     it("increases the next stream id", async function() {
            //                         const nextStreamId = await this.DAISO.nextStreamId();
            //                         await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_carol },
            //                         );
            //                         const newNextStreamId = await this.DAISO.nextStreamId();
            //                         newNextStreamId.should.be.bignumber.equal(nextStreamId.plus(1));
            //                     });
            //
            //                     it("emits a stream event", async function() {
            //                         const result = await this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_carol },
            //                         );
            //                         truffleAssert.eventEmitted(result, "CreateStream");
            //                     });
            //                 })
            //             });
            //
            //             describe("when the now is after the stop time", function() {
            //                 const amount = INVEST_SELL_BOB.toString(10);
            //
            //                 beforeEach(async function() {
            //                     await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
            //                 });
            //
            //                 it("reverts", async function() {
            //                     await truffleAssert.reverts(
            //                         this.DAISO.createStream(
            //                             this.projectId,
            //                             amount,
            //                             { from: invest_bob },
            //                             ),
            //                         "now is after project startTime",
            //                     );
            //                 });
            //
            //                 afterEach(async function() {
            //                     await traveler.advanceBlockAndSetTime(now.toNumber());
            //                 })
            //             });
            //         });
            //     });
            //
            //     describe("when the deposit is not valid", function() {
            //         describe("when the deposit is zero", function() {
            //             const amount = new BigNumber(0).toString(10);
            //             it("reverts", async function() {
            //                 truffleAssert.reverts(
            //                     this.DAISO.createStream(
            //                         this.projectId,
            //                         amount,
            //                         { from: invest_bob },
            //                     ),
            //                     "investSellDeposit is zero",
            //                 );
            //             });
            //         });
            //
            //         describe("when the deposit mod time delta is not zero", function() {
            //             const amount = INVEST_SELL_BOB.minus(1).toString(10);
            //
            //             it("reverts", async function() {
            //                 await truffleAssert.reverts(
            //                     this.DAISO.createStream(
            //                         this.projectId,
            //                         amount,
            //                         { from: invest_bob },
            //                     ),
            //                     "investSellDeposit not multiple of time delta",
            //                 );
            //             });
            //         });
            //     });
            // });
            //
            // describe("when the sender does not have enough tokens", function() {
            //     const amount = INVEST_SELL_BOB.multipliedBy(50).toString(10);
            //     it("reverts", async function() {
            //         await truffleAssert.reverts(
            //             this.DAISO.createStream(
            //                 this.projectId,
            //                 amount,
            //                 { from: invest_bob },
            //             ),
            //             truffleAssert.ErrorType.REVERT,
            //         );
            //     });
            // });
        // });

        // describe("when the contract does not have enough allowance", function() {
        //     beforeEach(async function() {
        //         await this.testDAI.approve(this.DAISO.address, 1, { from: invest_bob },);
        //     });
        //
        //     describe("when the sender has enough tokens", function() {
        //         const amount = INVEST_SELL_BOB.toString(10);
        //
        //         it("reverts", async function() {
        //             await truffleAssert.reverts(
        //                 this.DAISO.createStream(
        //                     this.projectId,
        //                     amount,
        //                     { from: invest_bob },
        //                 ),
        //                 truffleAssert.ErrorType.REVERT,
        //             );
        //         });
        //     });
        //
        //     describe("when the sender does not have enough tokens", function() {
        //         const amount = INVEST_SELL_BOB.multipliedBy(50).toString(10);
        //
        //         it("reverts", async function() {
        //             await truffleAssert.reverts(
        //                 this.DAISO.createStream(
        //                     this.projectId,
        //                     amount,
        //                     { from: invest_bob },
        //                 ),
        //                 truffleAssert.ErrorType.REVERT,
        //             );
        //         });
        //     });
        // });
    });

    // describe("when paused", function() {
    //     const amount = INVEST_SELL_BOB.toString(10);
    //
    //     beforeEach(async function() {
    //         await traveler.advanceBlockAndSetTime(now.toNumber());
    //
    //         await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10), {from: project});
    //         const result = await this.DAISO.createProject(
    //             this.xtestDAI.address,
    //             sellDeposit,
    //             this.testDAI.address,
    //             fundDeposit,
    //             startTime,
    //             stopTime,
    //             hash,
    //             {from: project}
    //         );
    //         this.projectId = Number(result.logs[0].args.projectId);
    //         await this.DAISO.pause({from: project});
    //     });
    //
    //     it("reverts", async function() {
    //         await truffleAssert.reverts(
    //             this.DAISO.createStream(
    //                 this.projectId,
    //                 amount,
    //                 { from: invest_bob },
    //             ),
    //             "Pausable: paused",
    //         );
    //     });
    // });
}

module.exports = shouldBehaveLikeCreateStream;