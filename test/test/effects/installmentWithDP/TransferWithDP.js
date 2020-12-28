const { devConstants,installment_mocha  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");


const { streamStartOfOne, streamStartOfTwo,streamStartOfThree,contextForStreamDidEnd } = installment_mocha;
const {
    STANDARD_SALARY,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
    NUMBEROFINSTALLMENTS,
    FEESOFRECIPIENTPER,
    DOWNPAYMENTRATIO,
} = devConstants;

function shouldBehaveLikeInstallmentWithDPtransferStream(alice, bob) {
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

        describe("when the streamId is exist", function() {
            beforeEach(function() {
                this.opts = { from: this.sender };
            });

            runTests();
        });

        describe("when the stream does not exist", function() {
            streamStartOfOne(function() {
                const recipient = bob;
                const opts = { from: recipient };

                it("reverts", async function() {
                    const streamId = new BigNumber(419863);
                    await truffleAssert.reverts(
                        this.streamPayOfInstallmentWithDP.transferWithDP(streamId,opts,),
                        "stream does not exist");
                });
            })

        });
    });
}

function runTests(){
    describe("when not paused",function() {
        describe("when the stream did not start", function () {
            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId,this.opts),
                    truffleAssert.ErrorType.REVERT,
                );
            });
        });

        streamStartOfOne(function() {
            it("transferWithDPs the tokens to the contract", async function() {
                const balance = await this.token.balanceOf(this.sender, this.opts);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                const newBalance = await this.token.balanceOf(this.sender, this.opts);
                balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY * 0.8 / NUMBEROFINSTALLMENTS))
            });

            it("emit a stream event", async function () {
                const result = await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, this.opts,);
                truffleAssert.eventEmitted(result, "TransferWithDP")
            });
        });

        describe("number of two",async function() {
            const now = new BigNumber(dayjs().unix());

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
            })

            it("transferWithDPs the tokens to the contract", async function() {
                const balance = await this.token.balanceOf(this.sender, this.opts);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, this.opts);
                const newBalance = await this.token.balanceOf(this.sender, this.opts);
                balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY * 0.8 / NUMBEROFINSTALLMENTS))
            });

            it("emit a stream event", async function () {
                const result = await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, this.opts,);
                truffleAssert.eventEmitted(result, "TransferWithDP")
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });

        describe("number of three",async function() {
            const now = new BigNumber(dayjs().unix());

            beforeEach(async function () {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from: this.sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from: this.sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(2400).toNumber(),);
            })

            it("reverts",async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId,this.opts,),
                    "DAISO_INVEST is finish",
                );
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });

        describe("end",function() {
            const now = new BigNumber(dayjs().unix());

            beforeEach(async function() {
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(1200).toNumber(),);
                await this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId, {from:this.sender});
                await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(5).plus(3600).toNumber(),);
            })

            it("reverts",async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId,this.opts,),
                    "DAISO_INVEST is finish",
                );
            });

            afterEach(async function() {
                await traveler.advanceBlockAndSetTime(now.toNumber());
            })
        });
    });

    describe("when paused",function() {
        streamStartOfOne(function() {
            beforeEach(async function() {
                await this.streamPayOfInstallmentWithDP.pause(this.opts);
            })

            it("reverts",async function() {
                await truffleAssert.reverts(
                    this.streamPayOfInstallmentWithDP.transferWithDP(this.streamId,this.opts,),
                    "Pausable: paused",
                );
            });
        });
    });
}

module.exports = shouldBehaveLikeInstallmentWithDPtransferStream;

