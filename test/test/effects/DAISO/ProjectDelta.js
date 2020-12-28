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

function shouldBehaveLikeProjectDelta(alice, bob) {
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

    describe("when the stream did not start", function() {
        it("returns delta", async function() {
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(0);
        });

        it("returns delta(investor cancel stream)", async function() {
            await this.DAISO.cancelInvest(projectId, { from: invest_bob })
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(0);
        });
    });

    contextForStreamDidStartButNotEnd(function() {
        it("returns delta", async function() {
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(5);
        });

        it("returns delta(project loss arbitration)", async function() {
            await this.DAISO.test(projectId, { from: project })
            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(1).toNumber());
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(5);
        });

        it("returns delta(investor cancel stream)", async function() {
            await this.DAISO.cancelInvest(projectId, { from: invest_bob })
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(0);

            await traveler.advanceBlockAndSetTime(now.plus(11).toNumber());
            const delta1 = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta1.should.be.bignumber.equal(1);
        });
    });

    contextForStreamDidEnd(function() {
        it("returns delta", async function() {
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(3600);
        });

        it("returns delta(project loss arbitration)", async function() {
            await this.DAISO.test(projectId, { from: project })

            await traveler.advanceBlockAndSetTime(now.plus(STANDARD_TIME_OFFSET).plus(STANDARD_TIME_DELTA).plus(1).toNumber());
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(3600);
        });

        it("returns delta(investor cancel stream)", async function() {
            await this.DAISO.cancelInvest(projectId, { from: invest_bob })
            const delta = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta.should.be.bignumber.equal(3600);

            await traveler.advanceBlockAndSetTime(now.plus(3611).toNumber());
            const delta1 = await this.DAISO.deltaOfForProject(projectId, { from: invest_bob });
            delta1.should.be.bignumber.equal(3600);
        });
    });
}

module.exports = shouldBehaveLikeProjectDelta;