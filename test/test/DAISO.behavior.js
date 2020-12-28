const { devConstants } = require("../node_modules/dev-utils");
const truffleAssert = require("../node_modules/truffle-assertions");

const shouldBehaveLikeCreateProject = require("./effects/DAISO/CreateProject");
const shouldBehaveLikeProjectBalanceOf = require("./effects/DAISO/ProjectBalanceOf")
const shouldBehaveLikeProjectRefunds = require("./effects/DAISO/ProjectRefunds")
const shouldBehaveLikeProjectDelta = require("./effects/DAISO/ProjectDelta")
const shouldBehaveLikeLaunchProposal = require("./effects/DAISO/launchProposal")
const shouldBehaveLikeVotingResult = require("./effects/DAISO/VotingResult")

const shouldBehaveLikeCreateStream = require("./effects/DAISO_INVEST/CreateStream")
const shouldBehaveLikeInvestWithdrawl = require("./effects/DAISO_INVEST/InvestWithdrawl")
const shouldBehaveLikeInvestDelta = require("./effects/DAISO_INVEST/InvestDelta")
const shouldBehaveLikeInvestCancel = require("./effects/DAISO_INVEST/InvestCancel")

const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeDAISO(alice,bob,carol){

    //project function

    // describe("CreateProject",function() {
    //     describe("CreateProject", function() {
    //         shouldBehaveLikeCreateProject(alice, bob);
    //     });
    // })

    // describe("ProjectRefunds",function() {
    //     describe("ProjectRefunds", function() {
    //         shouldBehaveLikeProjectRefunds(alice, bob);
    //     });
    // })

    // describe("LaunchProposal",function() {
    //     describe("LaunchProposal", function() {
    //         shouldBehaveLikeLaunchProposal(alice, bob, carol);
    //     });
    // })

    // describe("VotingResult",function() {
    //     describe("VotingResult", function() {
    //         shouldBehaveLikeVotingResult(alice, bob, carol);
    //     });
    // })


    // describe("ProjectBalance",function() {
    //     describe("ProjectBalance", function() {
    //         shouldBehaveLikeProjectBalanceOf(alice, bob, carol);
    //     });
    // })


    // describe("ProjectDelta",function() {
    //     describe("ProjectDelta", function() {
    //         shouldBehaveLikeProjectDelta(alice, bob);
    //     });
    // })

    //invest function
    // describe("CreateStream",function() {
    //     describe("CreateStream", function() {
    //         shouldBehaveLikeCreateStream(alice, bob, carol);
    //     });
    // })

    // describe("InvestWithdrawl",function() {
    //     describe("InvestWithdrawl", function() {
    //         shouldBehaveLikeInvestWithdrawl(alice, bob, carol);
    //     });
    // })

    // describe("InvestDelta",function() {
    //     describe("InvestDelta", function() {
    //         shouldBehaveLikeInvestDelta(alice, bob, carol);
    //     });
    // })

    describe("InvestCancel",function() {
        describe("InvestCancel", function() {
            shouldBehaveLikeInvestCancel(alice, bob, carol);
        });
    })
}

module.exports = shouldBehaveLikeDAISO;

