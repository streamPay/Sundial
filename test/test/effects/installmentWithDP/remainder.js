const { devConstants  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");


const {
    STANDARD_RATE_PER_SECOND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeInstallmentWithDPRemainder(alice, bob) {
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());
    const recipient = bob;
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(825);
    const deposit = new BigNumber(169318625);
    const NUMBEROFINSTALLMENTS = 3;
    const feesOfRecipientPer = 0;
    const DOWNPAYMENTRATIO = 20;
    // const feesOfRecipientPer = new BigNumber(1000000).toString(10);
    // const fees = new BigNumber(STANDARD_TIME_DELTA * NUMBEROFINSTALLMENTS * feesOfRecipientPer * 3600);

    describe("when the streamPayOfInstallment contract has enough allowance", function() {
        beforeEach(async function() {
            await this.token.approve(this.streamPayOfInstallmentWithDP.address, deposit.toString(10), opts);
        });

        // describe("crete installmentStreamWithDP",function() {
        //     it("creates the stream", async function() {
        //         const result = await this.streamPayOfInstallmentWithDP.createInstallmentWithDPStream(
        //             recipient,
        //             deposit,
        //             this.token.address,
        //             startTime,
        //             stopTime,
        //             NUMBEROFINSTALLMENTS,
        //             DOWNPAYMENTRATIO,
        //             feesOfRecipientPer,
        //             opts,
        //         );
        //         const streamObject = await this.streamPayOfInstallmentWithDP.getInstallmentWithDPStream(Number(result.logs[0].args.streamId));
        //         console.log(streamObject.deposit.toString());
        //         console.log(streamObject.downPaymentRatio.toString());
        //         console.log(streamObject.startTime.toString());
        //         console.log(streamObject.stopTime.toString());
        //         console.log(streamObject.numberOfInstallments.toString());
        //         console.log(streamObject.ratePerSecond.toString());
        //         console.log(streamObject.haveBeenNumberOfInstallment.toString());

                // streamObject.sender.should.be.equal(sender);
                // streamObject.recipient.should.be.equal(recipient);
                // streamObject.deposit.should.be.bignumber.equal(deposit);
                // streamObject.downPaymentRatio.should.be.bignumber.equal(DOWNPAYMENTRATIO);
                // streamObject.tokenAddress.should.be.equal(this.token.address);
                // streamObject.startTime.should.be.bignumber.equal(startTime);
                // streamObject.stopTime.should.be.bignumber.equal(stopTime);
                // streamObject.numberOfInstallments.should.be.bignumber.equal(NUMBEROFINSTALLMENTS);
                // streamObject.feesOfRecipientPer.should.be.bignumber.equal(feesOfRecipientPer);
                // streamObject.ratePerSecond.should.be.bignumber.equal(1);
                // streamObject.haveBeenNumberOfInstallment.should.be.bignumber.equal(1);
            // });
        // });
        describe('balance',async function() {
            it("not stoptime",async function() {
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
                this.streamId = Number(result.logs[0].args.streamId);

                //第一期
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(274).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, opts);

                const balance = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(275).toNumber(),);
                const balance1 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance1.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(276).toNumber(),);
                const balance2 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance2.toString());

                //第二期
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(549).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, opts);

                const balance4 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance4.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(550).toNumber(),);
                const balance5 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance5.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(551).toNumber(),);
                const balance6 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance6.toString());
                //
                // //第三期
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(824).toNumber(),);
                const balance7 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance7.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(825).toNumber(),);
                const balance8 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance8.toString());

                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(826).toNumber(),);
                const balance9 = await this.streamPayOfInstallmentWithDP.installmentWithDPBalanceOf.call(this.streamId,recipient,opts);
                console.log(balance9.toString());
                //
                await traveler.advanceBlockAndSetTime(now.toNumber());
            });
        });
    });
}

module.exports = shouldBehaveLikeInstallmentWithDPRemainder;