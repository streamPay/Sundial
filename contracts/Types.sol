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
        uint[] streamId;
        uint256 duration;
        bool isEntity;
    }

    struct Stream {
        uint256 projectId;
        uint256 investSellDeposit;
        uint256 investFundDeposit;
        uint256 ratePerSecondOfInvestSell;
        uint256 ratePerSecondOfInvestFund;
        address sender;
        uint256 investWithdrawalAmount;
        bool isEntity;
    }

    struct CancelProjectForInvest {
        uint256 exitProjectSellBalance;
        uint256 exitProjectFundBalance;
        uint256 exitStartTime;
        uint256 proposalForCancelStatus;
    }

    struct Proposal {
        uint256 amount;
        uint256 status;
        uint256 startTime;
        uint256 stopTime;
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
        bool isEntity;
    }

}
