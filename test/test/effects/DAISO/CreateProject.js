const { devConstants,mochaContexts  } = require("../../../node_modules/dev-utils");
const BigNumber = require("../../../node_modules/bignumber.js");
const dayjs = require("../../../node_modules/dayjs")
const truffleAssert = require("../../../node_modules/truffle-assertions");
const should = require('../../../node_modules/chai')
    .use(require('../../../node_modules/chai-bignumber')(BigNumber))
    .should();
const traveler = require("../../../node_modules/ganache-time-traveler");

const {
    PROJECT_SELL,
    PROJECT_FUND,
    STANDARD_TIME_OFFSET,
    STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeCreateProject(alice, bob) {
    const hash = "QmWhYu4HzPtQsFATK2D5KBUZjUhm1udbuKEXe69sH8Rvt5";
    const sender = alice;
    const opts = { from: sender };
    const now = new BigNumber(dayjs().unix());
    const lockPeriod = 10000;
    describe("when not paused", function() {
        describe("when the contract has enough allowance", function() {
            beforeEach(async function() {
                await this.xtestDAI.approve(this.DAISO.address, PROJECT_SELL.toString(10), opts);
                await traveler.advanceBlockAndSetTime(now.toNumber());
            });

            describe("when the sender has enough tokens", function() {
                describe("when the deposit is valid", function() {
                    const sellDeposit = PROJECT_SELL.toString(10);
                    const fundDeposit = PROJECT_FUND.toString(10);

                    describe("when the start time is after block.timestamp", function() {
                        describe("when the stop time is after the start time", function() {
                            const startTime = now.plus(STANDARD_TIME_OFFSET);
                            const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                            it("emits a project event", async function() {
                                const result = await this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                );
                                truffleAssert.eventEmitted(result, "CreateProject");
                            });

                            it("creates the project and get project info", async function() {
                                const result = await this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                );
                                const projectObject = await this.DAISO.getProject(Number(result.logs[0].args.projectId));
                                projectObject.projectSellDeposit.should.be.bignumber.equal(sellDeposit);
                                projectObject.projectFundDeposit.should.be.bignumber.equal(fundDeposit);
                                projectObject.projectActualSellDeposit.should.be.bignumber.equal(0);
                                projectObject.projectActualFundDeposit.should.be.bignumber.equal(0);
                                projectObject.projectWithdrawalAmount.should.be.bignumber.equal(0);
                                projectObject.sender.should.be.equal(sender);
                                projectObject.startTime.should.be.bignumber.equal(startTime);
                                projectObject.stopTime.should.be.bignumber.equal(stopTime);
                                projectObject.projectSellTokenAddress.should.be.equal(this.xtestDAI.address);
                                projectObject.projectFundTokenAddress.should.be.equal(this.testDAI.address);
                            });

                            it("transfers the tokens to the contract", async function() {
                                const balance = await this.xtestDAI.balanceOf(sender, opts);
                                await this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                );
                                const newBalance = await this.xtestDAI.balanceOf(sender, opts);
                                newBalance.should.be.bignumber.equal(balance.minus(sellDeposit));
                            });

                            it("increases the next project id", async function() {
                                const nextProjectId = await this.DAISO.nextProjectId();
                                await this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                );
                                const newNextProjectId = await this.DAISO.nextProjectId();
                                newNextProjectId.should.be.bignumber.equal(nextProjectId.plus(1));
                            });

                            it("change the value of cancelProjectForInvests", async function() {
                                const result = await this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                );
                                const projectObject = await this.DAISO.getCancelProjectForInvestAndProposal(Number(result.logs[0].args.projectId));
                                projectObject.exitStartTime.should.be.bignumber.equal(startTime);
                                projectObject.exitStopTime.should.be.bignumber.equal(stopTime);
                            });
                        });

                        describe("when the stop time is not after the start time", function() {
                            let startTime = now.plus(STANDARD_TIME_OFFSET);
                            let stopTime= startTime;

                            it("reverts", async function() {
                                await truffleAssert.reverts(
                                    this.DAISO.createProject(
                                        this.xtestDAI.address,
                                        sellDeposit,
                                        this.testDAI.address,
                                        fundDeposit,
                                        startTime,
                                        stopTime,
                                        lockPeriod,
                                        hash,
                                        opts
                                    ),
                                    "9",
                                );
                            });
                        });
                    });

                    describe("when the start time is not after block.timestamp", function() {
                        const startTime = now.minus(STANDARD_TIME_OFFSET);
                        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                        it("reverts", async function() {
                            await truffleAssert.reverts(
                                this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                ),
                                "8",
                            );
                        });
                    });

                    describe("when the sellDeposit mod duration is not zero", function() {
                        const startTime = now.plus(STANDARD_TIME_OFFSET);
                        const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                        const sellDeposit = PROJECT_SELL.plus(1).toString(10);
                        const fundDeposit = PROJECT_FUND.toString(10);

                        it("reverts", async function() {
                            await truffleAssert.reverts(
                                this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                ),
                                "10",
                            );
                        });
                    });

                    describe("when the fundDeposit mod duration is not zero", function() {
                        const startTime = now.plus(STANDARD_TIME_OFFSET);
                        const stopTime = startTime.plus(STANDARD_TIME_DELTA);
                        const sellDeposit = PROJECT_SELL.toString(10);
                        const fundDeposit = PROJECT_FUND.plus(1).toString(10);

                        it("reverts", async function() {
                            await truffleAssert.reverts(
                                this.DAISO.createProject(
                                    this.xtestDAI.address,
                                    sellDeposit,
                                    this.testDAI.address,
                                    fundDeposit,
                                    startTime,
                                    stopTime,
                                    lockPeriod,
                                    hash,
                                    opts
                                ),
                                "11",
                            );
                        });
                    });
                });
            });

            describe("when the sellDeposit or fundDeposit is not valid", function() {
                const startTime = now.plus(STANDARD_TIME_OFFSET);
                const stopTime = startTime.plus(STANDARD_TIME_DELTA);

                describe("when the sellDeposit is zero", function() {
                    const sellDeposit = new BigNumber(0).toString(10);
                    const fundDeposit = PROJECT_FUND.toString(10);
                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.DAISO.createProject(
                                this.xtestDAI.address,
                                sellDeposit,
                                this.testDAI.address,
                                fundDeposit,
                                startTime,
                                stopTime,
                                lockPeriod,
                                hash,
                                opts
                            ),
                            "6",
                        );
                    });
                });

                describe("when the fundDeposit is zero", function() {
                    const fundDeposit = new BigNumber(0).toString(10);
                    const sellDeposit = PROJECT_SELL.toString(10);
                    it("reverts", async function() {
                        await truffleAssert.reverts(
                            this.DAISO.createProject(
                                this.xtestDAI.address,
                                sellDeposit,
                                this.testDAI.address,
                                fundDeposit,
                                startTime,
                                stopTime,
                                lockPeriod,
                                hash,
                                opts
                            ),
                            "7",
                        );
                    });
                });
            });
        });

        describe("when the sender does not have enough tokens", function() {
            const fundDeposit = PROJECT_FUND.toString(10);
            const sellDeposit = PROJECT_SELL.multipliedBy(50).toString(10);
            const startTime = now.plus(STANDARD_TIME_OFFSET);
            const stopTime = startTime.plus(STANDARD_TIME_DELTA);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.createProject(
                        this.xtestDAI.address,
                        sellDeposit,
                        this.testDAI.address,
                        fundDeposit,
                        startTime,
                        stopTime,
                        lockPeriod,
                        hash,
                        opts
                    ),
                    truffleAssert.ErrorType.REVERT,
                );
            });
        });
    });

    describe("when the contract does not have enough allowance", function() {
        let startTime;
        let stopTime;

        beforeEach(async function() {
            startTime = now.plus(STANDARD_TIME_OFFSET);
            stopTime = startTime.plus(STANDARD_TIME_DELTA);
            await this.xtestDAI.approve(this.DAISO.address, 1, opts);
        });

        describe("when the sender has enough tokens", function() {
            const sellDeposit = PROJECT_SELL.toString(10);
            const fundDeposit = PROJECT_FUND.toString(10);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.createProject(
                        this.xtestDAI.address,
                        sellDeposit,
                        this.testDAI.address,
                        fundDeposit,
                        startTime,
                        stopTime,
                        lockPeriod,
                        hash,
                        opts
                    ),
                    truffleAssert.ErrorType.REVERT,
                );
            });
        });

        describe("when the sender does not have enough tokens", function() {
            const sellDeposit = PROJECT_SELL.multipliedBy(50).toString(10);
            const fundDeposit = PROJECT_FUND.toString(10);

            it("reverts", async function() {
                await truffleAssert.reverts(
                    this.DAISO.createProject(
                        this.xtestDAI.address,
                        sellDeposit,
                        this.testDAI.address,
                        fundDeposit,
                        startTime,
                        stopTime,
                        lockPeriod,
                        hash,
                        opts
                    ),
                    truffleAssert.ErrorType.REVERT,
                );
            });
        });
    });

    describe("when paused", function() {
        const sellDeposit = PROJECT_SELL.toString(10);
        const fundDeposit = PROJECT_FUND.toString(10);
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
            // Note that `sender` coincides with the owner of the contract
            await this.DAISO.pause(opts);
        });

        it("reverts", async function() {
            await truffleAssert.reverts(
                this.DAISO.createProject(
                    this.xtestDAI.address,
                    sellDeposit,
                    this.testDAI.address,
                    fundDeposit,
                    startTime,
                    stopTime,
                    lockPeriod,
                    hash,
                    opts
                ),
                "Pausable: paused",
            );
        });
    });
}





module.exports = shouldBehaveLikeCreateProject;