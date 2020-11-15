pragma solidity >= 0.5;


interface DAISOInterface {
/* DAISO */
    event CreateProject(
        uint256 indexed projectId,
        address indexed sender,
        address projectSellTokenAddress,
        uint256 projectSellDeposit,
        address projectFundTokenAddress,
        uint256 projectFundDeposit,
        uint256 startTime,
        uint256 stopTime,
        string hash
    );

    event CreateStream(uint256 indexed streamId, address indexed sender, uint256 projectId, uint256 investSellDeposit,
        uint256 investFundDeposit, uint256 startTime, uint256 stopTime);

    event LaunchProposal(
        uint256 indexed projectId,
        uint256 indexed streamId,
        uint256 amount,
        uint256 startTime,
        uint256 stopTime,
        address indexed sender,
        uint256 weight
    );

    event VoteForInvest(
        uint256 indexed projectId,
        uint256 indexed streamId,
        uint256 weight,
        uint256 voteResult
    );

    event WithdrawFromProject(
        uint256 indexed projectId,
        uint256 amount,
        uint256 pass,
        uint256 notPass
    );

    event CancelProject(
        uint256 indexed projectId,
        uint256 indexed streamId,
        address sender,
        uint256 investSellBalance,
        uint256 investFundBalance,
        uint256 refunds,
        uint256 cancelTime
    );

    event CancelProjectForProject (
        uint256 indexed projectId,
        uint256 projectSellBalance,
        uint256 refunds
    );

/* DAISOForInvest */
    event WithdrawFromInvest(
        uint256 indexed streamId,
        uint256 indexed projectId,
        address indexed sender,
        uint256 amount
    );

    event CancelStream(
        uint256 indexed projectId,
        uint256 indexed streamId,
        address indexed sender,
        uint256 investSellBalance,
        uint256 investFundBalance,
        uint256 cancelTime
    );

    event RullingResult(
        uint256 indexed projectId,
        uint256 rulling
    );
}