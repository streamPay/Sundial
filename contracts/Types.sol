pragma solidity 0.5.16;

library Types{
    struct Project {
        uint256 projectSellDeposit;
        uint256 projectFundDeposit;
        uint256 projectActualSellDeposit;
        uint256 projectActualFundDeposit;
        uint256 projectWithdrawalAmount;
        address payable sender;
        uint256 startTime;
        uint256 stopTime;
        address projectSellTokenAddress;
        address projectFundTokenAddress;
        uint256[] streamId;
        uint256 duration;
        uint256 lockPeriod;
    }

    enum VoteResult {NotPass, Pass}
    enum IsVote {NoVote, Voted}

    struct Stream {
        uint256 projectId;
        uint256 investSellDeposit;
        uint256 investFundDeposit;
        uint256 ratePerSecondOfInvestSell;
        uint256 ratePerSecondOfInvestFund;
        address sender;
        uint256 investWithdrawalAmount;
        VoteResult voteResult;
        IsVote isVote;
    }

    struct CancelProjectForInvest {
        uint256 exitProjectSellBalance;
        uint256 exitProjectFundBalance;
        uint256 exitStartTime;
        uint256 exitStopTime;
        uint256 proposalForCancelStatus;
        uint256 sumForInvestSellDeposit;
    }

    struct Proposal {
        uint256 amount;
        uint256 startTime;
        uint256 delta;
        uint256[] streamId;
    }

    enum Status {Initial, Reclaimed, Disputed, Resolved}

    struct Arbitration {
        address payable invest;
        address payable project;
        Status status;
        uint256 disputeID;
        uint256 reclaimedAt;
        uint256 feeDeposit;
        uint256 projectFeeDeposit;
    }

    enum RulingOptions {RefusedToArbitrate, InvestWins, ProjectWins}
}
