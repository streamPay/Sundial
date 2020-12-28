const { devConstants } = require("../node_modules/dev-utils");
const shouldBehaveLikeDAISO  = require("./DAISO.behavior");

const xtestDAI = artifacts.require("xTestnetDAI");
const testDAI = artifacts.require("TestnetDAI");
const DAISO = artifacts.require("./DAISO.sol")

xtestDAI.numberFormat = "BigNumber";
testDAI.numberFormat = "BigNumber";
DAISO.numberFormat = "BigNumber";
const { PROJECT_SELL, INVEST_SELL_BOB, INVEST_SELL_CAROL} = devConstants;

contract("DAISO",function DAISOtest([alice,bob,carol]) {
    beforeEach(async function() {
        const opts  = {from:alice};
        this.testDAI = await testDAI.new(opts );
        this.xtestDAI = await testDAI.new(opts );
        this.DAISO = await DAISO.new(opts )

        await this.xtestDAI.mint(alice,PROJECT_SELL.multipliedBy(3).toString(10),opts );
        await this.testDAI.mint(bob,INVEST_SELL_BOB.multipliedBy(3).toString(10),opts );
        await this.testDAI.mint(carol,INVEST_SELL_CAROL.multipliedBy(3).toString(10),opts );
    });
    shouldBehaveLikeDAISO(alice,bob,carol);
})