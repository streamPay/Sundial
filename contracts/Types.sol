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
    }

    enum VoteResult {Pass,NotPass}
    enum IsVote {NoVote,Voted}

    struct Stream {
        uint256 projectId;
        uint256 investSellDeposit;
        uint256 investFundDeposit;
        uint256 ratePerSecondOfInvestSell;
        uint256 ratePerSecondOfInvestFund;
        address sender;
        uint256 investWithdrawalAmount;
        uint256 voteForWight;
        VoteResult voteResult;
        IsVote isVote;
    }

    struct CancelProjectForInvest {
        uint256 exitProjectSellBalance;
        uint256 exitProjectFundBalance;
        uint256 exitStartTime;
        uint256 exitStopTime;
        uint256 proposalForCancelStatus;
    }

    struct Proposal {
        uint256 amount;
        uint256 startTime;
    }

    enum Status {Initial, Reclaimed, Disputed, Resolved}

    struct TX {
        address payable invest;
        address payable project;
        Status status;
        uint256 disputeID;
        uint256 reclaimedAt;
        uint256 investFeeDeposit;
        uint256 projectFeeDeposit;
        uint256 projectId;
    }

    enum RulingOptions {RefusedToArbitrate, InvestWins, ProjectWins}



}
