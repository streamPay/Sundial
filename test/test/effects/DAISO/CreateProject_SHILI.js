const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");

const {
    INVEST_SELL,
    INVEST_SELL_1,
    PROJECT_SELL,
    PROJECT_FUND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeCreateProject(alice, bob,carol) {
    const hash = "ABCD";
    const project = alice;
    const invest = bob
    const invest1 = carol
    const now = new BigNumber(dayjs().unix());
    const sellDeposit = PROJECT_SELL.toString(10);
    const fundDeposit = PROJECT_FUND.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const amount = INVEST_SELL.toString(10);
    const amount1 = INVEST_SELL_1.toString(10);
    const withdrawl = new BigNumber(30000000).toString(10);

    describe("when not paused", function() {
        beforeEach(async function() {
            await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10),  {from : project});
            await this.testDAI.approve(this.DAISO.address, INVEST_SELL.toString(10), {from : invest});
            await this.testDAI.approve(this.DAISO.address, INVEST_SELL_1.toString(10), {from : invest1});
        });

        describe("when the stop time is after the start time", function() {
            it("creates the project", async function() {
                const result = await this.DAISO.createProject(
                    this.xtestDAI.address,
                    sellDeposit,
                    this.testDAI.address,
                    fundDeposit,
                    startTime,
                    stopTime,
                    hash,
                    {from : project}
                );
                this.projectId = Number(result.logs[0].args.projectId);
                console.log(this.projectId);

                const result1 = await this.DAISO.createStream(
                    this.projectId,
                    amount1,
                    {from : invest1},
                );
                this.streamId1 = Number(result1.logs[0].args.streamId);
                const result2 = await this.DAISO.createStream(
                    this.projectId,
                    amount,
                    {from : invest},
                );
                this.streamId = Number(result2.logs[0].args.streamId);
                console.log(this.streamId)
                //放弃流
                await this.DAISO.updateAddress(alice,{from:alice})
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(50).toNumber(),);
                await this.DAISO.rullingResult(this.projectId,1,{from:alice})

                const investbalance = await this.testDAI.balanceOf(invest,{from:invest})
                const investbalance1 = await this.testDAI.balanceOf(invest1,{from:invest})
                console.log(investbalance.toString())
                console.log(investbalance1.toString())

                const balance3 =  await this.DAISO.projectBalanceOf(this.projectId,{from:invest})
                console.log(balance3.projectFundBalance.toString())
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(50).toNumber(),);

                const balance4 =  await this.DAISO.investBalanceOf(this.streamId,{from:invest})
                console.log(balance4.investSellBalance.toString())

                const balance5 =  await this.DAISO.investBalanceOf(this.streamId1,{from:invest})
                console.log(balance5.investSellBalance.toString())

                await this.DAISO.cancelInvest(this.streamId,{from:invest});
                await this.DAISO.cancelInvest(this.streamId1,{from:invest1});

                const newinvestbalance = await this.testDAI.balanceOf.call(invest,{from:invest})
                const newinvestbalance1 = await this.testDAI.balanceOf.call(invest1,{from:invest})
                console.log(newinvestbalance.toString())
                console.log(newinvestbalance1.toString())

                const getstream = await this.DAISO.getStream(this.streamId,{from:invest})
                console.log(getstream.ratePerSecondOfInvestSell.toString())
                const delta = await this.DAISO.deltaOf(this.streamId,{from:invest})
                console.log(delta.toString())




                //投资人提现
                // const balance = await this.xtestDAI.balanceOf.call(invest)
                // console.log(balance.toString())
                // const balance2 = await this.DAISO.getStream.call(this.streamId)
                // console.log(balance2.investWithdrawalAmount.toString())
                // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(100).toNumber(),);
                // await this.DAISO.withdrawFromInvest(this.streamId,'500000',{from : invest});
                // const balance1 = await this.xtestDAI.balanceOf.call(invest)
                // console.log(balance1.toString())
                // const balance4 = await this.DAISO.getStream.call(this.streamId)
                // console.log(balance4.investWithdrawalAmount.toString())
                //项目方提现
                // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(100).toNumber(),);
                // const investors = await this.DAISO.launchProposal(this.projectId,withdrawl,{from : project},);
                // console.log(investors)
                //
                //
                // const proposal = await this.DAISO.getProposal(this.projectId);
                // console.log(proposal.amount.toString())
                // console.log(proposal.status.toString())
                // console.log(proposal.startTime.toString())
                // console.log(proposal.stopTime.toString())
                //
                // const balance = await this.DAISO.getProject(this.projectId);
                // console.log(balance.projectWithdrawalAmount.toString())
                //
                // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(102).toNumber(),);
                // await this.DAISO.voteForInvest(this.projectId,2,{from : invest},);
                // await this.DAISO.voteForInvest(this.projectId,1,{from : invest1},);
                //
                // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(800).toNumber(),);
                // const result3 = await this.DAISO.votingResult(this.projectId,{from : project},);
                // console.log(result3.logs[0])
                //
                // const balance1 = await this.DAISO.getProject(this.projectId);
                // console.log(balance1.projectWithdrawalAmount.toString())
                //
                // const proposal1 = await this.DAISO.getProposal(this.projectId);
                // console.log(proposal1.amount.toString())

                // 投资人放弃流
                // const b1 = await this.DAISO.getProject(this.projectId);
                // console.log(b1.projectActualSellDeposit.toString())
                // console.log(b1.projectActualFundDeposit.toString())
                // const b2 = await this.DAISO.getCancelProjectForInvest(this.projectId);
                // console.log(b2.exitProjectSellBalance.toString())
                // console.log(b2.exitProjectFundBalance.toString())
                // console.log(b2.exitStartTime.toString())
                // console.log(b2.ratePerSecondOfProjectSell.toString())
                // console.log(b2.ratePerSecondOfProjectFund.toString())
                // const balance = await this.DAISO.projectBalanceOf.call(this.projectId,{from:invest});
                // console.log(balance.projectSellBalance.toString())
                // console.log(balance.projectFundBalance.toString())
                // console.log("-----------------")
                //
                // await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(100).toNumber(),);
                //
                // await this.DAISO.cancelInvest(this.streamId,{from:invest});
                // const b3 = await this.DAISO.getProject(this.projectId);
                // console.log(b3.projectActualSellDeposit.toString())
                // console.log(b3.projectActualFundDeposit.toString())
                // const b4 = await this.DAISO.getCancelProjectForInvest(this.projectId);
                // console.log(b4.exitProjectSellBalance.toString())
                // console.log(b4.exitProjectFundBalance.toString())
                // console.log(b4.exitStartTime.toString())
                // console.log(b4.ratePerSecondOfProjectSell.toString())
                // console.log(b4.ratePerSecondOfProjectFund.toString())
                //
                //
                //
                // const balance1 = await this.DAISO.projectBalanceOf.call(this.projectId,{from:invest});
                // console.log(balance1.projectSellBalance.toString())
                // console.log(balance1.projectFundBalance.toString())



            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })

            });
        });
    });
}





module.exports = shouldBehaveLikeCreateProject;